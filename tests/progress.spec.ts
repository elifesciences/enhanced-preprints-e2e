import { expect, test } from '@playwright/test';
import axios, { AxiosResponse } from 'axios';
import { createS3Client } from '../utils/create-s3-client';
import { createS3StateFile } from '../utils/create-s3-state-file';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';
import { changeState, resetState } from '../utils/wiremock';
import { EppPage } from './page-objects/epp-page';

test.describe('progress a manuscript through the manifestations', () => {
  const minioClient = createS3Client();
  const scheduleIds: Record<string, string> = {};

  const checkEmpty = async (eppPage: EppPage) => {
    // Verify that no preview or article page available.
    await eppPage.gotoPreviewPage({ status: 404 });
    await eppPage.gotoArticlePage({ status: 404 });
  };

  const checkPreview = async (eppPage: EppPage) => {
    // Wait for preview to become available.
    await eppPage.gotoPreviewPage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ status: 404 });
  };

  const checkReviews = async (eppPage: EppPage) => {
    // Wait for reviewed preprint to become available.
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);
  };

  const checkPreviewRevised = async (eppPage: EppPage) => {
    // Wait for preview of revised preprint to become available.
    await eppPage.gotoPreviewPage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 2, status: 404 });
    // Ensure that umbrella id still works with preview available
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);
  };

  const checkRevised = async (eppPage: EppPage) => {
    // Wait for revised preprint to become available.
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
  };

  const checkVersionOfRecord = async (eppPage: EppPage) => {
    // Wait for Version of Record summary to become available.
    await eppPage.gotoArticlePage({ version: 2 });
    await expect(async () => {
      const response = await eppPage.reload();
      expect(response?.status()).toBe(200);
      await eppPage.assertTimelineEventText(1, 'Version of Record');
      await eppPage.assertTimelineDetailText(1, 'June 7, 2023');
    }).toPass();
  };

  const checkVersionOfRecordCorrection = async (eppPage: EppPage) => {
    // Wait for Version of Record summary with correction to become available.
    await eppPage.gotoArticlePage({ version: 2 });
    await expect(async () => {
      const response = await eppPage.reload();
      expect(response?.status()).toBe(200);
      await eppPage.assertTimelineEventText(1, 'Version of Record');
      await eppPage.assertTimelineDetailText(1, 'July 6, 2023');
    }).toPass();
    await eppPage.assertTimelineEventText(2, 'Version of Record');
    await eppPage.assertTimelineDetailText(2, 'June 7, 2023');
  };

  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(async ({}, testInfo) => {
    scheduleIds[testInfo.title] = generateScheduleId(testInfo.title);
    await createS3StateFile(minioClient, testInfo.title);
    await startScheduledImportWorkflow(testInfo.title, scheduleIds[testInfo.title], await createTemporalClient());
  });

  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    const deleteVersions = async () => {
      const versions = await (await axios.get<any, AxiosResponse<{ items: { id: string }[] }>>(`${config.api_url}/api/preprints`)).data;
      const versionIds = versions.items.map((version) => version.id).filter((version) => version.startsWith(`${testInfo.title}-msidv`));
      return Promise.all(versionIds.map((id) => axios.delete(`${config.api_url}/preprints/${id}`)));
    };

    await Promise.all([
      stopScheduledImportWorkflow(scheduleIds[testInfo.title], await createTemporalClient()),
      deleteVersions(),
      deleteS3EppFolder(minioClient, `${testInfo.title}-msid`),
      deleteS3EppFolder(minioClient, `state/${testInfo.title}`),
      resetState(testInfo.title),
    ]);
  });

  [
    {
      name: 'empty-to-preview',
      setupCheck: checkEmpty,
      switchCheck: checkPreview,
    },
    {
      name: 'preview-to-reviews',
      setupCheck: checkPreview,
      switchCheck: checkReviews,
    },
    {
      name: 'reviews-to-preview-revised',
      setupCheck: checkReviews,
      switchCheck: checkPreviewRevised,
    },
    {
      name: 'preview-revised-to-revised',
      setupCheck: checkPreviewRevised,
      switchCheck: checkRevised,
    },
    {
      name: 'revised-to-version-of-record',
      setupCheck: checkRevised,
      switchCheck: checkVersionOfRecord,
    },
    {
      name: 'version-of-record-to-version-of-record-correction',
      setupCheck: checkVersionOfRecord,
      switchCheck: checkVersionOfRecordCorrection,
    },
  ].forEach(({ name, setupCheck, switchCheck }) => {
    test(`progress--${name}`, async ({ page }, testInfo) => {
      const eppPage = new EppPage(page, testInfo.title);

      await setupCheck(eppPage);

      await changeState(testInfo.title, 'Switch');

      await switchCheck(eppPage);
    });
  });
});

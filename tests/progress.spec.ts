import { expect, test } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { S3Client } from '@aws-sdk/client-s3';
import { createS3Client } from '../utils/create-s3-client';
import { createS3StateFile } from '../utils/create-s3-state-file';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';
import { changeState, resetState } from '../utils/wiremock';
import { EppPage } from './page-objects/epp-page';

const setUp = async (name: string, scheduleId: string, s3Client: S3Client) => {
  const temporal = await createTemporalClient();
  await createS3StateFile(s3Client, name);
  await startScheduledImportWorkflow(name, scheduleId, temporal);

  return temporal;
};

const tearDown = async (name: string, s3Client: S3Client, scheduleId: string, temporal: Client, versions: number) => {
  const deleteRequests = [];

  for (let i = 1; i <= versions; i += 1) {
    deleteRequests.push(axios.delete(`${config.api_url}/preprints/${name}-msidv${i}`));
  }

  await Promise.all([
    stopScheduledImportWorkflow(scheduleId, temporal),
    ...deleteRequests,
    deleteS3EppFolder(s3Client, `${name}-msid`),
    deleteS3EppFolder(s3Client, `state/${name}`),
    resetState(name),
  ]);
};

const switchState = async (name: string) => {
  await changeState(name, 'Switch');
};

test.describe('progress a manuscript through the manifestations', () => {
  const minioClient = createS3Client();
  const temporalClients: Record<string, Client> = {};
  const scheduleIds: Record<string, string> = {};
  const versions: Record<string, number> = {};

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
    temporalClients[testInfo.title] = await setUp(testInfo.title, scheduleIds[testInfo.title], minioClient);
  });

  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    await tearDown(testInfo.title, minioClient, scheduleIds[testInfo.title], temporalClients[testInfo.title], versions[testInfo.title] ?? 1);
  });

  [
    {
      name: 'empty-to-preview',
      setupCheck: async (eppPage: EppPage) => {
        await checkEmpty(eppPage);
      },
      switchCheck: async (eppPage: EppPage) => {
        await checkPreview(eppPage);
      },
    },
    {
      name: 'preview-to-reviews',
      setupCheck: async (eppPage: EppPage) => {
        await checkPreview(eppPage);
      },
      switchCheck: async (eppPage: EppPage) => {
        await checkReviews(eppPage);
      },
    },
    {
      name: 'reviews-to-preview-revised',
      setupCheck: async (eppPage: EppPage) => {
        versions[eppPage.getName()] = 2;
        await checkReviews(eppPage);
      },
      switchCheck: async (eppPage: EppPage) => {
        await checkPreviewRevised(eppPage);
      },
    },
    {
      name: 'preview-revised-to-revised',
      setupCheck: async (eppPage: EppPage) => {
        versions[eppPage.getName()] = 2;
        await checkPreviewRevised(eppPage);
      },
      switchCheck: async (eppPage: EppPage) => {
        await checkRevised(eppPage);
      },
    },
    {
      name: 'revised-to-version-of-record',
      setupCheck: async (eppPage: EppPage) => {
        versions[eppPage.getName()] = 3;
        await checkRevised(eppPage);
      },
      switchCheck: async (eppPage: EppPage) => {
        await checkVersionOfRecord(eppPage);
      },
    },
    {
      name: 'version-of-record-to-version-of-record-correction',
      setupCheck: async (eppPage: EppPage) => {
        versions[eppPage.getName()] = 3;
        await checkVersionOfRecord(eppPage);
      },
      switchCheck: async (eppPage: EppPage) => {
        await checkVersionOfRecordCorrection(eppPage);
      },
    },
  ].forEach(({ name, setupCheck, switchCheck }) => {
    test(`progress--${name}`, async ({ page }, testInfo) => {
      const eppPage = new EppPage(page, testInfo.title);

      await setupCheck(eppPage);

      await switchState(testInfo.title);

      await switchCheck(eppPage);
    });
  });
});

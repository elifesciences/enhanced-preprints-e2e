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

const setUp = async (name: string, s3Client: S3Client) => {
  const scheduleId = generateScheduleId(name);
  const temporal = await createTemporalClient();
  await createS3StateFile(s3Client, name);
  await startScheduledImportWorkflow(name, scheduleId, temporal);

  return {
    scheduleId,
    temporal,
  };
};

const tearDown = async (name: string, s3Client: S3Client, scheduleId: string, temporal: Client, versions: number = 1) => {
  const deleteRequests = [];

  for (let i = 1; i <= versions; i += 1) {
    deleteRequests.push(axios.delete(`${config.api_url}/preprints/${name}-msidv${i}`));
  }

  await Promise.all([
    stopScheduledImportWorkflow(scheduleId, temporal),
    ...deleteRequests,
    deleteS3EppFolder(s3Client, 'progress-msid'),
    deleteS3EppFolder(s3Client, `state/${name}`),
    resetState(name),
  ]);
};

const switchState = async (name: string) => {
  await changeState(name, 'Switch');
};

test.describe('progress a manuscript through the manifestations', () => {
  const minioClient = createS3Client();

  test('empty-to-preview', async ({ page }) => {
    const name = 'progress--empty-to-preview';
    const { scheduleId, temporal } = await setUp(name, minioClient);

    const eppPage = new EppPage(page, name);

    await eppPage.gotoPreviewPage({ status: 404 });
    await eppPage.gotoArticlePage({ status: 404 });

    await switchState(name);

    // Wait for preview to become available.
    await eppPage.gotoPreviewPage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ status: 404 });

    await tearDown(name, minioClient, scheduleId, temporal);
  });

  test('preview-to-reviews', async ({ page }) => {
    const name = 'progress--preview-to-reviews';
    const { scheduleId, temporal } = await setUp(name, minioClient);

    const eppPage = new EppPage(page, name);

    // Wait for preview to become available.
    await eppPage.gotoPreviewPage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ status: 404 });

    await switchState(name);

    // Wait for reviewed preprint to become available.
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await tearDown(name, minioClient, scheduleId, temporal);
  });

  test('reviews-to-preview-revised', async ({ page }) => {
    const name = 'progress--reviews-to-preview-revised';
    const { scheduleId, temporal } = await setUp(name, minioClient);

    const eppPage = new EppPage(page, name);

    // Wait for reviewed preprint to become available.
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await switchState(name);

    // Wait for preview of revised preprint to become available.
    await eppPage.gotoPreviewPage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 2, status: 404 });
    // Ensure that umbrella id still works with preview available
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await tearDown(name, minioClient, scheduleId, temporal, 2);
  });

  test('preview-revised-to-revised', async ({ page }) => {
    const name = 'progress--preview-revised-to-revised';
    const { scheduleId, temporal } = await setUp(name, minioClient);

    const eppPage = new EppPage(page, name);

    // Wait for preview of revised preprint to become available.
    await eppPage.gotoPreviewPage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 2, status: 404 });
    // Ensure that umbrella id still works with preview available
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await switchState(name);

    // Wait for revised preprint to become available.
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);

    await tearDown(name, minioClient, scheduleId, temporal, 2);
  });

  test('revised-to-version-of-record', async ({ page }) => {
    const name = 'progress--revised-to-version-of-record';
    const { scheduleId, temporal } = await setUp(name, minioClient);

    const eppPage = new EppPage(page, name);

    // Wait for revised preprint to become available.
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);

    await switchState(name);

    await expect(async () => {
      const response = await eppPage.reload();
      expect(response?.status()).toBe(200);
      await eppPage.assertTimelineEventText(1, 'Version of Record');
      await eppPage.assertTimelineDetailText(1, 'June 7, 2023');
    }).toPass();

    await tearDown(name, minioClient, scheduleId, temporal, 3);
  });
});

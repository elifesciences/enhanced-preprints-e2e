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

const tearDown = async (name: string, s3Client: S3Client, scheduleId: string, temporal: Client, versions: number = 1) => {
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

  test.describe('empty-to-preview', () => {
    let temporal: Client;
    const name = 'progress--empty-to-preview';
    const scheduleId = generateScheduleId(name);

    test.beforeAll(async () => {
      temporal = await setUp(name, scheduleId, minioClient);
    });

    test.afterAll(async () => {
      await tearDown(name, minioClient, scheduleId, temporal);
    });

    test('check', async ({ page }) => {
      const eppPage = new EppPage(page, name);

      await eppPage.gotoPreviewPage({ status: 404 });
      await eppPage.gotoArticlePage({ status: 404 });

      await switchState(name);

      // Wait for preview to become available.
      await eppPage.gotoPreviewPage();
      await eppPage.reloadAndAssertStatus(200);
      await eppPage.gotoArticlePage({ status: 404 });
    });
  });

  test.describe('preview-to-reviews', () => {
    let temporal: Client;
    const name = 'progress--preview-to-reviews';
    const scheduleId = generateScheduleId(name);

    test.beforeAll(async () => {
      temporal = await setUp(name, scheduleId, minioClient);
    });

    test.afterAll(async () => {
      await tearDown(name, minioClient, scheduleId, temporal);
    });

    test('check', async ({ page }) => {
      const eppPage = new EppPage(page, name);

      // Wait for preview to become available.
      await eppPage.gotoPreviewPage();
      await eppPage.reloadAndAssertStatus(200);
      await eppPage.gotoArticlePage({ status: 404 });

      await switchState(name);

      // Wait for reviewed preprint to become available.
      await eppPage.gotoArticlePage();
      await eppPage.reloadAndAssertStatus(200);
    });
  });

  test.describe('reviews-to-preview-revised', () => {
    let temporal: Client;
    const name = 'progress--reviews-to-preview-revised';
    const scheduleId = generateScheduleId(name);

    test.beforeAll(async () => {
      temporal = await setUp(name, scheduleId, minioClient);
    });

    test.afterAll(async () => {
      await tearDown(name, minioClient, scheduleId, temporal, 2);
    });

    test('check', async ({ page }) => {
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
    });
  });

  test.describe('preview-revised-to-revised', () => {
    let temporal: Client;
    const name = 'progress--preview-revised-to-revised';
    const scheduleId = generateScheduleId(name);

    test.beforeAll(async () => {
      temporal = await setUp(name, scheduleId, minioClient);
    });

    test.afterAll(async () => {
      await tearDown(name, minioClient, scheduleId, temporal, 2);
    });

    test('check', async ({ page }) => {
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
    });
  });

  test.describe('revised-to-version-of-record', () => {
    let temporal: Client;
    const name = 'progress--revised-to-version-of-record';
    const scheduleId = generateScheduleId(name);

    test.beforeAll(async () => {
      temporal = await setUp(name, scheduleId, minioClient);
    });

    test.afterAll(async () => {
      await tearDown(name, minioClient, scheduleId, temporal, 3);
    });

    test('check', async ({ page }) => {
      const eppPage = new EppPage(page, name);

      // Wait for revised preprint to become available.
      await eppPage.gotoArticlePage({ version: 2 });
      await eppPage.reloadAndAssertStatus(200);

      await switchState(name);

      // Wait for Version of Record summary to become available.
      await expect(async () => {
        const response = await eppPage.reload();
        expect(response?.status()).toBe(200);
        await eppPage.assertTimelineEventText(1, 'Version of Record');
        await eppPage.assertTimelineDetailText(1, 'June 7, 2023');
      }).toPass();
    });
  });

  test.describe('version-of-record-to-version-of-record-correction', () => {
    let temporal: Client;
    const name = 'progress--version-of-record-to-version-of-record-correction';
    const scheduleId = generateScheduleId(name);

    test.beforeAll(async () => {
      temporal = await setUp(name, scheduleId, minioClient);
    });

    test.afterAll(async () => {
      await tearDown(name, minioClient, scheduleId, temporal, 3);
    });

    test('check', async ({ page }) => {
      const eppPage = new EppPage(page, name);

      // Wait for Version of Record summary to become available.
      await eppPage.gotoArticlePage({ version: 2 });
      await expect(async () => {
        const response = await eppPage.reload();
        expect(response?.status()).toBe(200);
        await eppPage.assertTimelineEventText(1, 'Version of Record');
        await eppPage.assertTimelineDetailText(1, 'June 7, 2023');
      }).toPass();

      await switchState(name);

      // Wait for Version of Record summary with correction to become available.
      await expect(async () => {
        const response = await eppPage.reload();
        expect(response?.status()).toBe(200);
        await eppPage.assertTimelineEventText(1, 'Version of Record');
        await eppPage.assertTimelineDetailText(1, 'July 6, 2023');
      }).toPass();
      await eppPage.assertTimelineEventText(2, 'Version of Record');
      await eppPage.assertTimelineDetailText(2, 'June 7, 2023');
    });
  });
});

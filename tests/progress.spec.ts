import { test } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';
import { changeState, resetState } from '../utils/wiremock';
import { EppPage } from './page-objects/epp-page';

test.describe('progress a manuscript through the manifestations', () => {
  let temporal: Client;
  const name = 'progress';
  const scheduleId = generateScheduleId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, scheduleId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      axios.delete(`${config.api_url}/preprints/progress-msidv1`),
      axios.delete(`${config.api_url}/preprints/progress-msidv2`),
      deleteS3EppFolder(minioClient, 'progress-msid'),
      deleteS3EppFolder(minioClient, `state/${name}`),
      resetState(name),
    ]);
  });

  test('successful progression of manuscript', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.gotoPreviewPage({ status: 404 });
    await eppPage.gotoArticlePage({ status: 404 });

    await changeState(name, 'Preview');

    // Wait for preview to become available.
    await eppPage.gotoPreviewPage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ status: 404 });

    await changeState(name, 'Reviews');

    // Wait for reviewed preprint to become available.
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await changeState(name, 'Preview Revised');

    // Wait for preview of revised preprint to become available.
    await eppPage.gotoPreviewPage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.gotoArticlePage({ version: 2, status: 404 });
    // Ensure that umbrella id still works with preview available
    await eppPage.gotoArticlePage();
    await eppPage.reloadAndAssertStatus(200);

    await changeState(name, 'Revised');

    // Wait for revised preprint to become available.
    await eppPage.gotoArticlePage({ version: 2 });
    await eppPage.reloadAndAssertStatus(200);
  });
});

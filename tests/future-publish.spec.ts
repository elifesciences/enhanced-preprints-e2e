import { test } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { createS3StateFile } from '../utils/create-s3-state-file';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';
import { EppPage } from './page-objects/epp-page';

test.describe('reviewed preprint', () => {
  let temporal: Client;
  const name = 'future-publish';
  const scheduleId = generateScheduleId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, scheduleId, temporal, '10  minutes');
    await createS3StateFile(minioClient, name);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
    ]);
  });

  test('test reviewed-preprint with future published date is not available until published time has passed', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    // first wait for the preview to be published
    await eppPage.gotoPreviewPage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);

    // ensure the preprint isn't published
    await eppPage.gotoArticlePage({ version: 1, status: 404 });

    // then, wait for the reviewed preprint to be published (with the passage of time)
    await eppPage.gotoArticlePage({ version: 1 });
    await eppPage.reloadAndAssertStatus(200);
  });
});

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

test.describe('reviewed preprint with related content', () => {
  let temporal: Client;
  const name = 'related-content';
  const scheduleId = generateScheduleId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, scheduleId, temporal);
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

  test('related content is coming through', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.gotoReviewsPage();
    await eppPage.reloadAndAssertStatus(200);
    await eppPage.assertRelatedContent(
      1,
      'Related Insight',
      'Hearing: Letting the calcium flow',
      'https://doi.org/10.7554/eLife.96139',
      'Régis Nouvian',
    );
  });
});

import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';
import { EppPage } from './page-objects/epp-page';

test.describe('reviewed preprint', () => {
  let temporal: Client;
  const name = 'reviews';
  const scheduleId = generateScheduleId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, scheduleId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
    ]);
  });

  test('test reviews and DOIs are visible on reviewed-preprint', async ({ page }) => {
    const eppPage = new EppPage(page, name);
    await eppPage.navigateToReviewsPage();
    await expect(async () => {
      const response = await page.reload();
      expect(response?.status()).toBe(200);
    }).toPass();
    await eppPage.assertTitleVisibility();
    await eppPage.assertTitleText('OpenApePose: a database of annotated ape photographs for pose estimation');
    await eppPage.assertPeerReviewContent(0, 'evaluation 2');
    await eppPage.assertPeerReviewContent(1, 'evaluation 1');
    await eppPage.assertAuthorResponse('author response');

    await eppPage.assertPeerReviewDoi(0, 'https://doi.org/10.7554/eLife.000001.1.sa2');
    await eppPage.assertPeerReviewDoi(1, 'https://doi.org/10.7554/eLife.000001.1.sa1');
    await eppPage.assertAuthorResponseDoi('https://doi.org/10.7554/eLife.000001.1.sa0');
  });
});

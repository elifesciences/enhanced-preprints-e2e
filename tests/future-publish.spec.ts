import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateWorkflowId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';

test.describe('reviewed preprint', () => {
  let temporal: Client;
  const name = 'future-publish';
  const workflowId = generateWorkflowId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, workflowId, temporal, '10  minutes');
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(workflowId, temporal),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
    ]);
  });

  test('test reviewed-preprint with future published date is not available until published time has passed', async ({ page }) => {
    // first wait for the preview to be published
    await page.goto(`${config.client_url}/previews/${name}-msidv1`);
    await expect(async () => {
      const previewResponse = await page.reload();
      expect(previewResponse?.status()).toBe(200);
    }).toPass();

    // ensure the preprint isn't published
    const prePublishedResponse = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    expect(prePublishedResponse?.status()).toBe(404);

    // then, wait for the reviewed preprint to be published (with the passage of time)
    await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    await expect(async () => {
      const postPublishedResponse = await page.reload();
      expect(postPublishedResponse?.status()).toBe(200);
    }).toPass();
  });
});

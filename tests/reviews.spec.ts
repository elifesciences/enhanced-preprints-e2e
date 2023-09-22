import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateWorkflowId, startWorkflow, stopWorkflow,
} from '../utils/temporal';

test.describe('reviewed preprint', () => {
  let temporal: Client;
  const name = 'reviews';
  const workflowId = generateWorkflowId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startWorkflow(name, workflowId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopWorkflow(workflowId, temporal),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
    ]);
  });

  test('test reviews are visible on reviewed-preprint', async ({ page }) => {
    await expect(async () => {
      const response = await page.goto(`${config.client_url}/reviewed-preprints/reviews-msidv1/reviews`);
      expect(response?.status()).toBe(200);
    }).toPass();
    await expect(page.locator('h1.title')).toBeVisible();
    await expect(page.locator('h1.title')).toContainText('OpenApePose: a database of annotated ape photographs for pose estimation');
    await expect(page.locator('#peer-review-0')).toContainText('evaluation 1');
    await expect(page.locator('#peer-review-1')).toContainText('evaluation 2');
    await expect(page.locator('#author-response')).toContainText('author response');
  });
});

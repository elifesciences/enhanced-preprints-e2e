import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateWorkflowId, startWorkflow, stopWorkflow,
} from '../utils/temporal';

test.describe('preview preprint', () => {
  let temporal: Client;
  const name = 'preview';
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

  test('test previews are visible', async ({ page }) => {
    await expect(async () => {
      const response = await page.goto(`${config.client_url}/previews/${name}-msidv1`);
      expect(response?.status()).toBe(200);
    }).toPass();
    await expect(page.locator('h1.title')).toBeVisible();
    await expect(page.locator('h1.title')).toHaveText('THIS IS BROKEN: OpenApePose: a database of annotated ape photographs for pose estimation');
    // eslint-disable-next-line max-len
    await expect(page.locator('.copyright')).toContainText('This article is distributed under the terms of the Creative Commons Attribution License, which permits unrestricted use and redistribution provided that the original author and source are credited.');

    const response = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
    expect(response?.status()).toBe(404);
  });
});

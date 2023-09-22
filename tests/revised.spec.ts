import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
    createTemporalClient, generateWorkflowId, startWorkflow, stopWorkflow,
  } from '../utils/temporal';

test.describe('revised preprint', () => {
  let temporal: Client;
  const name = 'revised';
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
      axios.delete(`${config.api_url}/preprints/${name}-msidv2`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
    ]);
  });

  test('revised preprints are available', async ({ page }) => {
    await expect(async () => {
      const response = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
      expect(response?.status()).toBe(200);
    }).toPass();
    const response = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv2`);
    expect(response?.status()).toBe(200);
  });
});

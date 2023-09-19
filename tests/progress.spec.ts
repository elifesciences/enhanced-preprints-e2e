import { test, expect } from '@playwright/test';
import axios from 'axios';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import { Client } from '@temporalio/client';
import { createTemporalClient, generateWorkflowId, startWorkflow, stopWorkflow } from '../utils/temporal';
import { changeState, resetState } from '../utils/wiremock';

test.describe('progress a manuscript through the manifestations', () => {
  let temporal: Client;
  const name = 'progress';
  const workflowId = generateWorkflowId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startWorkflow(name, workflowId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopWorkflow(workflowId, temporal),
      axios.delete(`${config.api_url}/preprints/progress-msidv1`),
      deleteS3EppFolder(minioClient, 'progress-msid'),
      resetState(name),
    ]);
  });

  test('successful progression of manuscript', async ({ page }) => {
    const response1 = await page.goto(`${config.client_url}/previews/progress-msid`);
    expect(response1?.status()).toBeGreaterThan(400);

    await changeState(name, 'Preview');

    // Wait for preview to become available.
    await expect(async () => {
      const response2 = await page.goto(`${config.client_url}/previews/progress-msid`);
      expect(response2?.status()).toBe(200);
    }).toPass();
    const response3 = await page.goto(`${config.client_url}/reviewed-preprints/progress-msid`);
    expect(response3?.status()).toBe(404);

    await changeState(name, 'Published');

    await expect(async () => {
      const response4 = await page.goto(`${config.client_url}/reviewed-preprints/progress-msid`);
      expect(response4?.status()).toBe(200);
    }).toPass();
  });
});


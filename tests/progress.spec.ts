import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateWorkflowId, startWorkflow, stopWorkflow,
} from '../utils/temporal';
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
      axios.delete(`${config.api_url}/preprints/progress-msidv2`),
      deleteS3EppFolder(minioClient, 'progress-msid'),
      resetState(name),
    ]);
  });

  test('successful progression of manuscript', async ({ page, request }) => {
    const response1 = await page.goto(`${config.client_url}/previews/${name}-msid`);
    expect(response1?.status()).toBe(404);
    const response2 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msid`);
    expect(response2?.status()).toBe(404);

    await changeState(name, 'Preview');

    // Wait for preview to become available.
    await page.goto(`${config.client_url}/previews/${name}-msid`);
    await expect(async () => {
      const response3 = await page.reload();
      expect(response3?.status()).toBe(200);
    }).toPass();
    const response4 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msid`);
    expect(response4?.status()).toBe(404);

    await changeState(name, 'Reviews');

    // Wait for reviewed preprint to become available.
    await page.goto(`${config.client_url}/reviewed-preprints/${name}-msid`);
    await expect(async () => {
      const response5 = await page.reload();
      expect(response5?.status()).toBe(200);
    }).toPass();

    await changeState(name, 'Preview Revised');

    // Wait for preview of revised preprint to become available.
    await page.goto(`${config.client_url}/previews/${name}-msidv2`);
    await expect(async () => {
      const response6 = await page.reload();
      expect(response6?.status()).toBe(200);
    }).toPass();
    const response7 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv2`);
    expect(response7?.status()).toBe(404);

    await changeState(name, 'Revised');

    // Wait for revised preprint to become available.
    await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv2`);
    await expect(async () => {
      const response8 = await page.reload();
      expect(response8?.status()).toBe(200);
    }).toPass();
  });
});

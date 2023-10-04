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

test.describe('unpublished preprint', () => {
  let temporal: Client;
  const name = 'unpublish';
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
      resetState(name),
    ]);
  });

  test('preprints can be unpublished', async ({ page }) => {
    await expect(async () => {
      const responsev1 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
      expect(responsev1?.status()).toBe(200);
    }).toPass();

    await expect(page.locator('h1.title')).toBeVisible();
    await expect(page.locator('h1.title')).toHaveText('OpenApePose: a database of annotated ape photographs for pose estimation');

    await changeState(name, 'unpublished');

    // Wait for unpublished article to become unavailable
    await expect(async () => {
      const response2 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msidv1`);
      expect(response2?.status()).toBe(404);
    }).toPass();
    const response3 = await page.goto(`${config.client_url}/reviewed-preprints/${name}-msid`);
    expect(response3?.status()).toBe(404);
    const response4 = await page.goto(`${config.client_url}/previews/${name}-msidv1`);
    expect(response4?.status()).toBe(200);
  });
});

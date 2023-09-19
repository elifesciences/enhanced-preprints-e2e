import { test, expect } from '@playwright/test';
import axios from 'axios';
import { generateWorkflowId } from '../utils/generate-workflow-id';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { createTemporalClient } from '../utils/create-temporal-client';
import { config } from '../utils/config';

test.describe('progress a manuscript through the manifestations', () => {
  let temporal: any;
  const workflowId = generateWorkflowId('progress');
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId,
      args: ['http://wiremock:8080/docmaps/progress', '30 seconds'],
    });
  });

  test.afterAll(async () => {
    await Promise.all([
      temporal.workflow.getHandle(workflowId).terminate('end of preview test'),
      axios.delete(`${config.api_url}/preprints/progress-msidv1`),
      deleteS3EppFolder(minioClient, 'progress-msid'),
      axios.put(`${config.wiremock_url}/__admin/scenarios/progress/state`),
    ]);
  });

  test('successful progression of manuscript', async ({ page }) => {
    const response1 = await page.goto(`${config.client_url}/previews/progress-msid`);
    expect(response1?.status()).toBeGreaterThan(400);

    await axios.put(`${config.wiremock_url}/__admin/scenarios/progress/state`, { state: 'Preview' });

    // Wait for preview to become available.
    await expect(async () => {
      const response2 = await page.goto(`${config.client_url}/previews/progress-msid`);
      expect(response2?.status()).toBe(200);
    }).toPass();
    const response3 = await page.goto(`${config.client_url}/reviewed-preprints/progress-msid`);
    expect(response3?.status()).toBe(404);

    await axios.put(`${config.wiremock_url}/__admin/scenarios/progress/state`, { state: 'Published' });

    await expect(async () => {
      const response4 = await page.goto(`${config.client_url}/reviewed-preprints/progress-msid`);
      expect(response4?.status()).toBe(200);
    }).toPass();
  });
});

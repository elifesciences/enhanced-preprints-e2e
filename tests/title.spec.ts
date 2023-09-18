import { test, expect } from '@playwright/test';
import axios from 'axios';
import { generateWorkflowId } from '../utils/generate-workflow-id';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import { createTemporalClient } from '../utils/create-temporal-client';

test.describe('that it displays title on the page', () => {
  let temporal: any;
  const workflowId = generateWorkflowId('title');
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId,
      args: ['http://wiremock:8080/docmaps/title', '1 minute'],
    });
  });

  test.afterAll(async () => {
    await Promise.all([
      temporal.workflow.getHandle(workflowId).terminate('end of title test'),
      axios.delete(`${config.api_url}/preprints/title-msidv1`),
      deleteS3EppFolder(minioClient, 'title-msid'),
    ]);
  });

  test('display the title', async ({ page }) => {
    await expect(async () => {
      const response = await page.goto(`${config.client_url}/reviewed-preprints/title-msidv1`);
      expect(response?.status()).toBe(200);
    }).toPass();
    await expect(page.locator('h1.title')).toBeVisible();
    await expect(page.locator('h1.title')).toContainText('OpenApePose: a database of annotated ape photographs for pose estimation');
  });
});

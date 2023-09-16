import { test, expect } from '@playwright/test';
import { Client } from '@temporalio/client';
import axios from 'axios';
import { generateWorkflowId } from '../utils/generate-workflow-id';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';

test.describe('manuscript available in preview', () => {
  const temporal = new Client();
  const workflowId = generateWorkflowId('preview');
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId,
      args: ['http://wiremock:8080/docmaps/preview', '30 seconds'],
    });
  });

  test.afterAll(async () => {
    await Promise.all([
      temporal.workflow.getHandle(workflowId).terminate('end of preview test'),
      axios.delete('http://localhost:3000/preprints/preview-msidv1'),
      deleteS3EppFolder(minioClient, 'preview-msid'),
      axios.put('http://localhost:8080/__admin/scenarios/preview/state'),
    ]);
  });

  test('and later published', async ({ page }) => {
    const response1 = await page.goto('http://localhost:3001/previews/preview-msid');
    expect(response1?.status()).toBeGreaterThan(400);

    await axios.put('http://localhost:8080/__admin/scenarios/preview/state', {'state': 'Preview'});

    // Wait for preview to become available.
    await expect(async () => {
      const response2 = await page.goto('http://localhost:3001/previews/preview-msid');
      expect(response2?.status()).toBe(200);
    }).toPass();
    const response3 = await page.goto('http://localhost:3001/reviewed-preprints/preview-msid');
    expect(response3?.status()).toBe(404);

    await axios.put('http://localhost:8080/__admin/scenarios/preview/state', {'state': 'Published'});

    await expect(async () => {
      const response4 = await page.goto('http://localhost:3001/reviewed-preprints/preview-msid');
      expect(response4?.status()).toBe(200);
    }).toPass();
  });
});

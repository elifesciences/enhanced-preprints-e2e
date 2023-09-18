import { test, expect } from '@playwright/test';
import { Client } from '@temporalio/client';
import axios from 'axios';
import { generateWorkflowId } from '../utils/generate-workflow-id';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';

test.describe('that it displays title on the page', () => {
  const temporal = new Client();
  const workflowId = generateWorkflowId('title');
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId,
      args: ['http://wiremock:8080/docmaps/title', '1 minute'],
    });
  });

  test.afterAll(async () => {
    await Promise.all([
      temporal.workflow.getHandle(workflowId).terminate('end of title test'),
      axios.delete('http://localhost:3000/preprints/title-msidv1'),
      deleteS3EppFolder(minioClient, 'title-msid'),
    ]);
  });

  test('display the title', async ({ page }) => {
    await expect(async () => {
      const response = await page.goto('http://localhost:3001/reviewed-preprints/title-msidv1');
      expect(response?.status()).toBe(200);
    }).toPass();
    await expect(page.locator('h1.title')).toBeVisible();
    await expect(page.locator('h1.title')).toContainText('OpenApePose: a database of annotated ape photographs for pose estimation');
  });
});

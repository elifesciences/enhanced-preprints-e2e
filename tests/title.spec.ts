import { test, expect } from '@playwright/test';
import { Client } from '@temporalio/client';
import axios from 'axios';
import { generateWorkflowId } from '../utils/generate-workflow-id';
import { S3Client } from '@aws-sdk/client-s3';
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

test.describe('that it displays title on the page', () => {
  const temporal = new Client();
  const workflowId = generateWorkflowId('title');
  const minioClient = new S3Client({
    credentials: {accessKeyId: 'minio', secretAccessKey: 'miniotest'},
    endpoint: "http://localhost:9100",
    forcePathStyle: true,
    region: "us-east-1",
  });

  test.beforeAll(async () => {
    await temporal.workflow.start('pollDocMapIndex', {
      taskQueue: 'epp',
      workflowId,
      args: ['http://wiremock:8080/docmaps/title', '1 minute'],
    });
  });
  
  
  test.afterAll(async () => {
    await temporal.workflow.getHandle(workflowId).terminate('end of title test');
    await axios.delete('http://localhost:3000/preprints/title-msidv1');
    await minioClient.send(new DeleteObjectCommand({Bucket: "epp", Key: "automation/title-msid"}));
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

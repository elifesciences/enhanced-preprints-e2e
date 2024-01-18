import { test, expect } from '@playwright/test';
import axios from 'axios';
import { Client } from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { config } from '../utils/config';
import {
  createTemporalClient, generateWorkflowId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';

test.describe('threshold', () => {
  let temporal: Client;
  const name = 'threshold';
  const workflowId = generateWorkflowId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, workflowId, temporal, '1 minute', 1);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(workflowId, temporal),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `state/${name}`),
    ]);
  });

  test('test that the docmap threshold triggers workflow pause', async () => {
    await expect(async () => {
      const response = await temporal.workflow.getHandle(workflowId).query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
      expect(response.docMapUrls).not.toBeNull();
    }).toPass();
  });
});

import { test, expect } from '@playwright/test';
import { Client, ScheduleHandle } from '@temporalio/client';
import axios from 'axios';
import {
  createTemporalClient,
  generateScheduleId,
  getScheduleRunningWorkflows,
  getWorkflowHandle,
  startScheduledImportWorkflow,
  stopScheduledImportWorkflow,
} from '../utils/temporal';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { createS3Client } from '../utils/create-s3-client';
import { createS3StateFile } from '../utils/create-s3-state-file';
import { config } from '../utils/config';

test.describe('threshold', () => {
  let temporal: Client;
  let scheduleId: string;
  let scheduleHandle: ScheduleHandle;
  let workflowId: string;
  const minioClient = createS3Client();
  const name = 'threshold';

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    scheduleId = generateScheduleId(name);
    await createS3StateFile(minioClient, name);
    scheduleHandle = await startScheduledImportWorkflow(name, scheduleId, temporal, '1 minute', 1);
    [workflowId] = await getScheduleRunningWorkflows(scheduleHandle);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      deleteS3EppFolder(minioClient, `state/${name}`),
    ]);
  });

  test('test that the docmap threshold triggers workflow pause', async () => {
    const workflowHandle = getWorkflowHandle(workflowId, temporal);

    // Wait for threshold pause to commence and check output.
    await expect(async () => {
      const response = await workflowHandle.query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
      expect(response.docMapUrls).not.toBeNull();
      expect(response.docMapUrls).toHaveLength(2);
    }).toPass();

    // Send approval signal with value of false.
    await workflowHandle.signal('approval', false);
    await expect(async () => {
      const workflowStatus = await workflowHandle.describe().then((wf) => wf.status.name);
      expect(workflowStatus).toBe('COMPLETED');
    }).toPass();

    // Confirm no longer awaiting approval.
    const response = await workflowHandle.query('awaitingApproval');
    expect(response).toBeNull();
  });

  test('test that import continues when approval signal true', async () => {
    const workflowHandle = getWorkflowHandle(workflowId, temporal);

    // Wait for threshold pause to commence and check output.
    await expect(async () => {
      const response = await workflowHandle.query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
      expect(response.docMapUrls).not.toBeNull();
      expect(response.docMapUrls).toHaveLength(2);
    }).toPass();

    // Send approval signal with value of true.
    await workflowHandle.signal('approval', true);
    await expect(async () => {
      const workflowStatus = await workflowHandle.describe().then((wf) => wf.status.name);
      expect(workflowStatus).toBe('COMPLETED');
    }).toPass();

    // Confirm no longer awaiting approval.
    const response = await getWorkflowHandle(workflowId, temporal).query('awaitingApproval');
    expect(response).toBeNull();

    // Check previews available on server.
    expect((await axios.get(`${config.api_url}/api/preprints/${name}-msidv1?previews`).then((r) => r.status))).toBe(200);
    expect((await axios.get(`${config.api_url}/api/preprints/${name}-msid-2v1?previews`).then((r) => r.status))).toBe(200);

    // Cleanup unique to this test.
    await Promise.all([
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `${name}-msid-2`),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      axios.delete(`${config.api_url}/preprints/${name}-msid-2v1`),
    ]);
  });
});

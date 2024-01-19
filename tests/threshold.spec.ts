import { test, expect } from '@playwright/test';
import { Client, ScheduleHandle } from '@temporalio/client';
import {
  createTemporalClient,
  generateScheduleId,
  getScheduleHandle,
  getScheduleRunningWorkflows,
  getWorkflowHandle,
  startScheduledImportWorkflow,
  stopScheduledImportWorkflow,
} from '../utils/temporal';
import { deleteS3EppFolder } from '../utils/delete-s3-epp-folder';
import { createS3Client } from '../utils/create-s3-client';
import axios from 'axios';
import { config } from '../utils/config';

test.describe('threshold', () => {
  const minioClient = createS3Client();
  let temporal: Client;
  let scheduleHandle: ScheduleHandle;
  const name = 'threshold';
  const scheduleId = generateScheduleId(name);

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, scheduleId, temporal, '1 minute', 1);
    scheduleHandle = getScheduleHandle(scheduleId, temporal);
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
      deleteS3EppFolder(minioClient, `state/${name}`),
    ]);
  });

  test('test that the docmap threshold triggers workflow pause', async () => {
    const [workflowId] = await getScheduleRunningWorkflows(scheduleHandle);
    await expect(async () => {
      const response = await getWorkflowHandle(workflowId, temporal).query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
      expect(response.docMapUrls).not.toBeNull();
      expect(response.docMapUrls).toHaveLength(2);
    }).toPass();
    await getWorkflowHandle(workflowId, temporal).signal('approval', false);
    await expect(async () => {
      const workflowStatus = await getWorkflowHandle(workflowId, temporal).describe().then((wf) => wf.status.name);
      expect(workflowStatus).toBe('COMPLETED');
    }).toPass();
    const response = await getWorkflowHandle(workflowId, temporal).query('awaitingApproval');
    expect(response).toBeNull();
  });

  test('test that import continues when approval signal true', async () => {
    const [workflowId] = await getScheduleRunningWorkflows(scheduleHandle);
    await expect(async () => {
      const response = await getWorkflowHandle(workflowId, temporal).query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
      expect(response.docMapUrls).not.toBeNull();
      expect(response.docMapUrls).toHaveLength(2);
    }).toPass();
    await getWorkflowHandle(workflowId, temporal).signal('approval', true);
    await expect(async () => {
      const workflowStatus = await getWorkflowHandle(workflowId, temporal).describe().then((wf) => wf.status.name);
      expect(workflowStatus).toBe('COMPLETED');
    }).toPass();
    const response = await getWorkflowHandle(workflowId, temporal).query('awaitingApproval');
    expect(response).toBeNull();
    expect((await axios.get(`${config.api_url}/preprints/${name}-msidv1`, { params: { previews: true } }).then((r) => r.status))).toBe(200);
    expect((await axios.get(`${config.api_url}/preprints/${name}-msid-2v1`, { params: { previews: true } }).then((r) => r.status))).toBe(200);

    // Cleanup
    await Promise.all([
      deleteS3EppFolder(minioClient, `${name}-msid`),
      deleteS3EppFolder(minioClient, `${name}-msid-2`),
      axios.delete(`${config.api_url}/preprints/${name}-msidv1`),
      axios.delete(`${config.api_url}/preprints/${name}-msid-2v1`),
    ]);
  });
});

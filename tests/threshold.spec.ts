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

test.describe('threshold', () => {
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
    ]);
  });

  test('test that the docmap threshold triggers workflow pause', async () => {
    const [workflowId] = await getScheduleRunningWorkflows(scheduleHandle);
    await expect(async () => {
      const response = await getWorkflowHandle(workflowId, temporal).query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
      expect(response.docMapUrls).not.toBeNull();
      expect(response.docMapUrls).toHaveLength(2);
    }).toPass();
  });
});

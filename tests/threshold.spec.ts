import { test, expect } from '@playwright/test';
import {Client, ScheduleDescription} from '@temporalio/client';
import { createS3Client } from '../utils/create-s3-client';
import {
  createTemporalClient, generateScheduleId, startScheduledImportWorkflow, stopScheduledImportWorkflow,
} from '../utils/temporal';

test.describe('threshold', () => {
  let temporal: Client;
  let schedule: ScheduleDescription;
  const name = 'threshold';
  const scheduleId = generateScheduleId(name);
  const minioClient = createS3Client();

  test.beforeAll(async () => {
    temporal = await createTemporalClient();
    await startScheduledImportWorkflow(name, scheduleId, temporal, '1 minute', 1);
    schedule = await temporal.schedule.getHandle(scheduleId).describe();
  });

  test.afterAll(async () => {
    await Promise.all([
      stopScheduledImportWorkflow(scheduleId, temporal),
    ]);
  });

  test('test that the docmap threshold triggers workflow pause', async () => {
    let workflowId: string | null = null;
    while (!workflowId) {
      workflowId = schedule.raw.info!.runningWorkflows![0].workflowId ?? null;
    }
    await expect(async () => {
      const response = await temporal.workflow.getHandle(workflowId!).query<{ awaitingApproval: number, docMapUrls: string[] }>('awaitingApproval');
      expect(response.docMapUrls).not.toBeNull();
      expect(response.docMapUrls).toHaveLength(2);
    }).toPass();

  });
});

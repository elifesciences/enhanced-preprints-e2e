import { Client, Connection, ScheduleOverlapPolicy } from '@temporalio/client';
import { config } from './config';

export const generateWorkflowId = (prefix: string): string => {
  if (prefix.trim().length === 0) {
    throw Error('Empty prefix');
  }

  return `${prefix.trim()}-${new Date().getTime()}`;
};

export const createTemporalClient = async () => {
  const connection = await Connection.connect({ address: config.temporal_address });
  return new Client({ connection });
};

export const startScheduledImportWorkflow = async (testName: string, scheduleId: string, client: Client, duration: any = '1 minute', docMapThreshold?: number) => {
  const handle = await client.schedule.create({
    scheduleId,
    spec: {
      intervals: [{ every: duration }],
    },
    policies: {
      overlap: ScheduleOverlapPolicy.ALLOW_ALL,
    },
    action: {
      type: 'startWorkflow',
      workflowType: 'importDocmaps',
      taskQueue: 'epp',
      args: [{ docMapIndexUrl: `http://wiremock:8080/docmaps/${testName}`, s3StateFileUrl: testName, docMapThreshold }],
    },
  });

  // trigger immediately
  await handle.trigger();
  return handle;
};

export const stopScheduledImportWorkflow = async (scheduleId: string, client: Client) => {
  const handle = client.schedule.getHandle(scheduleId);
  await handle.delete();
  return handle;
};

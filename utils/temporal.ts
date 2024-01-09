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

export const startScheduledImportWorkflow = async (testName: string, workflowId: string, client: Client, duration: any = '1 minute') => {
  const handle = await client.schedule.create({
    scheduleId: workflowId,
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
      args: [`{ "docMapIndexUrl": "http://wiremock:8080/docmaps/${testName}" }`, testName],
    },
  });

  // trigger immediately
  await handle.trigger();
  return handle;
};

export const stopScheduledImportWorkflow = async (workflowId: string, client: Client) => {
  const handle = client.schedule.getHandle(workflowId);
  await handle.delete();
  return handle;
};

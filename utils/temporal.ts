import { config } from './config';
import { Client, Connection } from '@temporalio/client';

export const generateWorkflowId = (prefix: string): string => {
  if (prefix.trim().length === 0) { 
    throw Error('Empty prefix');
  }

  return `${prefix.trim()}-${new Date().getTime()}`;
};

export const createTemporalClient = async () => {
  const connection = await Connection.connect({ address: config.temporal_address });
  return new Client({ connection });
}

export const startWorkflow = async (testName: string, workflowId: string, client: Client) => {
  return client.workflow.start('pollDocMapIndex', {
    taskQueue: 'epp',
    workflowId,
    args: [`http://wiremock:8080/docmaps/${testName}`, '1 minute'],
  });
}

export const stopWorkflow = async (workflowId: string, client: Client, message = `end of test`) => {
  return client.workflow.getHandle(workflowId)
    .terminate(message);
};


import { S3Client } from '@aws-sdk/client-s3';
import {
  createTemporalClient,
  generateScheduleId,
  getScheduleRunningWorkflows,
  startScheduledImportWorkflow,
} from './temporal';
import { createS3StateFile } from './create-s3-state-file';

export const testSetup = async (name: string, s3Client: S3Client, duration?: string, docMapThreshold?: number) => {
  const scheduleId = generateScheduleId(name);
  await createS3StateFile(s3Client, name);
  const scheduleHandle = await startScheduledImportWorkflow(name, scheduleId, await createTemporalClient(), duration, docMapThreshold);
  const [workflowId] = await getScheduleRunningWorkflows(scheduleHandle);

  return {
    scheduleId,
    scheduleHandle,
    workflowId,
  };
};

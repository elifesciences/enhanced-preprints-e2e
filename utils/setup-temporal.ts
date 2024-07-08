import { S3Client } from '@aws-sdk/client-s3';
import { ScheduleHandle } from '@temporalio/client';
import {
  createTemporalClient,
  generateScheduleId,
  getScheduleRunningWorkflows,
  startScheduledImportWorkflow,
  stopScheduledImportWorkflow,
} from './temporal';
import { createS3StateFile } from './create-s3-state-file';
import { deleteS3EppFolder } from './delete-s3-epp-folder';
import { resetState } from './wiremock';
import { createS3Client } from './create-s3-client';
import { deleteVersions } from './delete-versions';

export const setupClientAndScheduleStores = () => {
  const scheduleIds: Record<string, string> = {};
  const scheduleHandles: Record<string, ScheduleHandle> = {};
  const workflowIds: Record<string, string> = {};

  return {
    scheduleIds,
    minioClient: createS3Client(),
    scheduleHandles,
    workflowIds,
  };
};

export const setupTemporal = async (params: { name: string, s3Client: S3Client, duration?: string, docMapThreshold?: number }) => {
  const {
    name,
    s3Client,
    duration,
    docMapThreshold,
  } = params;
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

export const trashTemporal = async (params: { name: string, s3Client: S3Client, scheduleId?: string, msid?: string }) => {
  const {
    name,
    s3Client,
    scheduleId,
    msid,
  } = params;

  const msidValue = msid ?? `${name}-msid`;

  await Promise.all([
    ...(scheduleId ? [await stopScheduledImportWorkflow(scheduleId, await createTemporalClient())] : []),
    deleteVersions(msidValue),
    deleteS3EppFolder(s3Client, msidValue),
    deleteS3EppFolder(s3Client, `state/${name}`),
    resetState(name),
  ]);
};

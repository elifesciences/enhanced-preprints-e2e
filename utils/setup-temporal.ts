import { S3Client } from '@aws-sdk/client-s3';
import { ScheduleHandle } from '@temporalio/client';
import axios, { AxiosResponse } from 'axios';
import {
  createTemporalClient,
  generateScheduleId,
  getScheduleRunningWorkflows,
  startScheduledImportWorkflow,
  stopScheduledImportWorkflow,
} from './temporal';
import { createS3StateFile } from './create-s3-state-file';
import { config } from './config';
import { deleteS3EppFolder } from './delete-s3-epp-folder';
import { resetState } from './wiremock';
import { createS3Client } from './create-s3-client';

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

export const trashTemporal = async (name: string, s3Client: S3Client, scheduleId: string, stateReset: boolean = true) => {
  const deleteVersions = async () => {
    // eslint-disable-next-line prefer-destructuring
    const data = (await axios.get<any, AxiosResponse<{ versions: Record<string, any> }>>(`${config.api_url}/api/preprints/${name}-msid`, {
      params: {
        previews: true,
      },
    })).data;

    return Promise.all(Object.keys(data.versions).map((id) => axios.delete(`${config.api_url}/preprints/${id}`)));
  };

  await Promise.all([
    stopScheduledImportWorkflow(scheduleId, await createTemporalClient()),
    deleteVersions(),
    deleteS3EppFolder(s3Client, `${name}-msid`),
    deleteS3EppFolder(s3Client, `state/${name}`),
    ...(stateReset ? [resetState(name)] : []),
  ]);
};

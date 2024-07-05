import { ScheduleHandle } from '@temporalio/client';
import { createS3Client } from './create-s3-client';

export const testClientAndScheduleIds = () => {
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

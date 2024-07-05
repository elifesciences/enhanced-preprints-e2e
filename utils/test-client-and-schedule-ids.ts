import { createS3Client } from './create-s3-client';

export const testClientAndScheduleIds = () => {
  const scheduleIds: Record<string, string> = {};

  return {
    scheduleIds,
    minioClient: createS3Client(),
  };
};

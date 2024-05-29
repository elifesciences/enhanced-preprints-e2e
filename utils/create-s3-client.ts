import { S3Client } from '@aws-sdk/client-s3';
import { config } from './config';

export const createS3Client = (): S3Client => new S3Client({
  credentials: { accessKeyId: 'minio', secretAccessKey: 'miniotest' },
  endpoint: config.minio_url,
  forcePathStyle: true,
  region: 'us-east-1',
});

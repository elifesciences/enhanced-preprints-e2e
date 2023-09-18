import { S3Client } from '@aws-sdk/client-s3';

export const createS3Client = (): S3Client => new S3Client({
  credentials: {accessKeyId: 'minio', secretAccessKey: 'miniotest'},
  endpoint: 'http://localhost:9100',
  forcePathStyle: true,
  region: 'us-east-1',
});

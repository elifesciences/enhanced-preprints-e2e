import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const createS3StateFile = async (client: S3Client, testName: string) => {
  await client.send(new PutObjectCommand({
    Bucket: 'epp',
    Key: `automation/state/${testName}`,
    Body: JSON.stringify([]),
  }));
};

import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

export const deleteS3EppFolder = async (client: S3Client, folder: string) => {
  const bucket = 'epp';
  // List all objects in the folder
  const { Contents } = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: `automation/${folder}`,
  }));

  // Check if Contents is defined
  if (Contents) {
    // Delete each object
    for (const object of Contents) {
      if (object.Key) {
        await client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: object.Key,
        }));
      }
    }
  }
};

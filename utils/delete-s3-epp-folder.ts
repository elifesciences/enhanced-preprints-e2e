import { DeleteObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';

const bucket = 'epp';

const checkS3EppFolder = async (client: S3Client, folder: string) => {
  const { Contents } = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: `automation/${folder}`,
  }));

  return Contents;
};

export const deleteS3EppFolder = async (client: S3Client, folder: string) => {
  const contents = await checkS3EppFolder(client, folder);
  if (contents) {
    await Promise.all(contents.map((object) => (object.Key ? client.send(new DeleteObjectCommand({ Bucket: bucket, Key: object.Key })) : null)));
  }
};

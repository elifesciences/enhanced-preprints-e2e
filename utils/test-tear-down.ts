import { S3Client } from '@aws-sdk/client-s3';
import axios, { AxiosResponse } from 'axios';
import {
  createTemporalClient,
  stopScheduledImportWorkflow,
} from './temporal';
import { config } from './config';
import { deleteS3EppFolder } from './delete-s3-epp-folder';
import { resetState } from './wiremock';

export const testTearDown = async (name: string, s3Client: S3Client, scheduleId: string, stateReset: boolean = true) => {
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

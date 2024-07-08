import axios, { AxiosResponse } from 'axios';
import { config } from './config';

const getVersions = async (msid: string) => axios.get<any, AxiosResponse<{ versions: Record<string, any> }>>(`${config.api_url}/api/preprints/${msid}`, {
  params: {
    previews: true,
  },
  validateStatus: (status) => [200, 404].includes(status),
}).then((response) => ((response.status === 404) ? [] : Object.keys(response.data.versions)));

export const deleteVersions = async (msid: string) => {
  const versions = await getVersions(msid);
  if (versions.length > 0) {
    await Promise.all(versions.map((id) => axios.delete(`${config.api_url}/preprints/${id}`)));
  }
};

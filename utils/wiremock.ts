import axios from 'axios';
import { config } from './config';

export const resetState = async (testName: string) => axios.put(`${config.wiremock_url}/__admin/scenarios/${testName}/state`, undefined, {
  validateStatus: (status) => [200, 404].includes(status),
});

export const changeState = async (testName: string, state: string) => axios.put(`${config.wiremock_url}/__admin/scenarios/${testName}/state`, { state });

import axios from "axios";
import { config } from './config';

export const resetState = async (testName: string) => {
   return axios.put(`${config.wiremock_url}/__admin/scenarios/${testName}/state`);
};

export const changeState = async (testName: string, state: string) => {
  return axios.put(`${config.wiremock_url}/__admin/scenarios/${testName}/state`, { state });
};

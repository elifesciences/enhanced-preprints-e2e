import { config } from './config';
import { Client, Connection } from "@temporalio/client";

export const createTemporalClient = async () => {
  if (config.temporal_url.length > 0) {
    const connection = await Connection.connect({ address: 'temporal:7233' });
    return new Client({ connection });
  } else {
    return new Client();
  }
} 


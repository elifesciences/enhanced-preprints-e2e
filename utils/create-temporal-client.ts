import { config } from './config';
import { Client, Connection } from '@temporalio/client';

export const createTemporalClient = async () => {
  const connection = await Connection.connect({ address: config.temporal_address });
  return new Client({ connection });
}


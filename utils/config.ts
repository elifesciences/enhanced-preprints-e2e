export const config = {
  minio_url: process.env.minio_url ?? 'http://localhost:9100',
  client_url: process.env.client_url ?? 'http://localhost:3001',
  api_url: process.env.api_url ?? 'http://localhost:3000',
  temporal_url: process.env.temporal_url ?? '',
};


export const config = {
  minio_url: process.env.minio_url ?? 'http://localhost:9100',
  client_url: process.env.client_url ?? 'http://localhost:3001',
  api_url: process.env.api_url ?? 'http://localhost:3000',
  temporal_address: process.env.temporal_address ?? undefined,
  wiremock_url: process.env.wiremock_url ?? 'http://localhost:8080',
  import_controller_url: process.env.import_controller_url ?? 'http://localhost:3006',
};

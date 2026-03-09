import { Client } from 'pg';

export interface IPgConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled?: boolean;
  sslConfig?: Record<string, unknown>;
}

export async function createPgConnection(
  config: IPgConnectionConfig,
): Promise<Client> {
  const client = new Client({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.sslEnabled ? (config.sslConfig ?? { rejectUnauthorized: false }) : undefined,
    connectionTimeoutMillis: 10_000,
  });

  await client.connect();
  return client;
}

export async function closePgConnection(client: Client): Promise<void> {
  await client.end();
}

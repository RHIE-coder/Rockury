import mysql from 'mysql2/promise';

export interface IMysqlConnectionConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslEnabled?: boolean;
  sslConfig?: Record<string, unknown>;
}

export async function createMysqlConnection(
  config: IMysqlConnectionConfig,
): Promise<mysql.Connection> {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.username,
    password: config.password,
    ssl: config.sslEnabled ? (config.sslConfig ?? {}) : undefined,
    connectTimeout: 10_000,
  });

  return connection;
}

export async function closeMysqlConnection(
  conn: mysql.Connection,
): Promise<void> {
  await conn.end();
}

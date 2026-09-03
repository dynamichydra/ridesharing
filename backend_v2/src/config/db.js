import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';

const sslConfig = (process.env.DB_SSL || env.DB_SSL) === 'true' ? { rejectUnauthorized: false } : undefined;

const pool = new pg.Pool({
  host: process.env.DB_HOST || env.DB_HOST,
  port: parseInt(process.env.DB_PORT || env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || env.DB_NAME,
  user: process.env.DB_USER || env.DB_USER,
  password: process.env.DB_PASSWORD || env.DB_PASSWORD,
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ...(sslConfig ? { ssl: sslConfig } : {}),
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL client error:', err.message);
});

export const db = drizzle({ client: pool });
export { pool };

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from './env.js';

// DB_SSL=true encrypts the connection; with DB_SSL_CA (the provider's CA bundle, PEM) the
// server certificate is verified too. Without a CA, verification is skipped (encrypted but
// not authenticated) — set DB_SSL_CA in production.
const sslEnabled = (process.env.DB_SSL || env.DB_SSL) === 'true';
// Env vars often carry the PEM with literal "\n" sequences — turn them back into newlines.
const sslCa = env.DB_SSL_CA ? env.DB_SSL_CA.replace(/\\n/g, '\n') : null;
const sslConfig = sslEnabled ? (sslCa ? { ca: sslCa, rejectUnauthorized: true } : { rejectUnauthorized: false }) : undefined;

const pool = new pg.Pool({
  host: process.env.DB_HOST || env.DB_HOST,
  port: parseInt(process.env.DB_PORT || env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || env.DB_NAME,
  user: process.env.DB_USER || env.DB_USER,
  password: process.env.DB_PASSWORD || env.DB_PASSWORD,
  // Shared by HTTP, sockets, Kafka consumers, BullMQ workers and matching — size it from
  // load tests and the database's connection limit (DB_POOL_MAX x instances).
  max: parseInt(env.DB_POOL_MAX, 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  allowExitOnIdle: true,
  ...(sslConfig ? { ssl: sslConfig } : {}),
});

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL client error:', err.message);
});

export const db = drizzle({ client: pool });
export { pool };

// import { drizzle } from 'drizzle-orm/node-postgres';
// import pg from 'pg';
// import { env } from './env.js';
// import * as schema from '../../drizzle/schema/index.js';

// const pool = new pg.Pool({
//   connectionString: env.DATABASE_URL,
//   max: 20,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 2000,
// });

// pool.on('error', (err) => {
//   console.error('Unexpected PG pool error:', err);
// });

// export const db = drizzle(pool, { schema });
// export { pool };


import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Managed Postgres (Aiven, RDS, etc.) requires SSL; local/docker Postgres usually doesn't.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle({ client: pool });
export { pool };


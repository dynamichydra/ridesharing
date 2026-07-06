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

const dbUrl = new URL(process.env.DATABASE_URL);
const pool = new pg.Pool({
  host:     dbUrl.hostname,
  port:     parseInt(dbUrl.port || '5432', 10),
  database: dbUrl.pathname.replace(/^\//, ''),
  user:     decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
});

export const db = drizzle({ client: pool });
export { pool };


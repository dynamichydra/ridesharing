import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const dbUrl = new URL(process.env.DATABASE_URL);

export default defineConfig({
  out: './drizzle/migrations',
  schema: './drizzle/schema/index.js',
  dialect: 'postgresql',
  dbCredentials: {
    host:     dbUrl.hostname,
    port:     parseInt(dbUrl.port || '5432', 10),
    user:     decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: dbUrl.pathname.replace(/^\//, ''),
    ssl:      false,
  },
});

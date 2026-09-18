import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle/migrations',
  schema: './drizzle/schema/index.js',
  dialect: 'postgresql',
  dbCredentials: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT || '5432', 10),
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  },
});

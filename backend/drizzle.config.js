// import 'dotenv/config';
// export default {
//   schema: './drizzle/schema/index.js',
//   out: './drizzle/migrations',
//   dialect: 'postgresql',
//   dbCredentials: { url: process.env.DATABASE_URL },
// };


import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './drizzle/migrations',
  schema: './drizzle/schema/index.js',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

const postgres = require("postgres");
const { drizzle } = require("drizzle-orm/postgres-js");

const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString);

const db = drizzle(client);

module.exports = db;
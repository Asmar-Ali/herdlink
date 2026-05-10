import { config } from 'dotenv';
import { Client } from 'pg';
import { resolve } from 'path';

// Load test env before anything else
config({ path: resolve(__dirname, '.env.test') });

export default async function globalSetup() {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    // connect to the default maintenance db to issue CREATE DATABASE
    database: 'postgres',
  });

  await client.connect();

  const dbName = process.env.POSTGRES_DB ?? 'herdlink_test';
  const exists = await client.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`,
    [dbName],
  );

  if (exists.rowCount === 0) {
    // identifiers can't be parameterised in Postgres
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`[e2e] Created test database: ${dbName}`);
  }

  await client.end();
}

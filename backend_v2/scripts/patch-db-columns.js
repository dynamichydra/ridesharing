import 'dotenv/config';
import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'rideshare_db',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function patchDatabaseColumns() {
  console.log('🔧 Synchronizing physical Postgres columns with Drizzle schema...');
  const client = await pool.connect();
  try {
    // 1. Cities table columns
    await client.query(`
      ALTER TABLE IF EXISTS "cities" ADD COLUMN IF NOT EXISTS "city_type_id" uuid;
      ALTER TABLE IF EXISTS "cities" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'ACTIVE';
      ALTER TABLE IF EXISTS "cities" ADD COLUMN IF NOT EXISTS "polygon" jsonb;
      ALTER TABLE IF EXISTS "cities" ADD COLUMN IF NOT EXISTS "hex_cells" text[];
      ALTER TABLE IF EXISTS "cities" ADD COLUMN IF NOT EXISTS "resolution" integer DEFAULT 8;
      ALTER TABLE IF EXISTS "cities" ADD COLUMN IF NOT EXISTS "created_by" uuid;
      ALTER TABLE IF EXISTS "cities" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now();
    `);

    // 2. City Type Fares table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "city_type_fares" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "city_type_id" uuid NOT NULL,
        "vehicle_type_id" uuid NOT NULL,
        "base_fare_minor" integer DEFAULT 0 NOT NULL,
        "min_fare_minor" integer DEFAULT 0 NOT NULL,
        "per_km_rate_minor" integer DEFAULT 0 NOT NULL,
        "per_min_rate_minor" integer DEFAULT 0 NOT NULL,
        "waiting_price_per_min_minor" integer DEFAULT 0,
        "waiting_grace_period_min" integer DEFAULT 3,
        "booking_fee_minor" integer DEFAULT 0,
        "service_fee_minor" integer DEFAULT 0,
        "cancellation_fee_minor" integer DEFAULT 0,
        "no_show_fee_minor" integer DEFAULT 0,
        "surge_floor_multiplier" numeric(4,2) DEFAULT '1.00',
        "surge_cap_multiplier" numeric(4,2) DEFAULT '3.00',
        "non_subscriber_commission_rate" numeric(5,4) DEFAULT '0.2000',
        "subscriber_commission_rate" numeric(5,4) DEFAULT '0.0500',
        "platform_fee_minor" integer DEFAULT 0,
        "min_commission_minor" integer DEFAULT 0,
        "max_commission_minor" integer,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    console.log('✅ Physical database columns synchronized successfully!');
  } catch (err) {
    console.error('❌ Error patching columns:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

patchDatabaseColumns();

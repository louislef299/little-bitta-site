import { SQL } from "bun";

const PG_HOST = process.env.PG_HOST ?? "localhost";
const PG_PORT = process.env.PG_PORT ?? "5432";
const PG_USER = process.env.PG_USER ?? "postgres";
const PG_PASS = process.env.PG_PASS ?? "password";
const TEST_DB = "little_bitta_test";

let testSql: InstanceType<typeof SQL> | null = null;

/**
 * Get or create a connection to the test database.
 * Creates the little_bitta_test database if it doesn't exist.
 */
export async function getTestSql(): Promise<InstanceType<typeof SQL>> {
  if (testSql) return testSql;

  // Connect to default postgres DB to create the test database
  const admin = new SQL(
    `postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/postgres`,
  );

  // Check if test DB exists, create if not
  const existing =
    await admin`SELECT 1 FROM pg_database WHERE datname = ${TEST_DB}`;
  if (existing.length === 0) {
    // Can't use parameterized queries for CREATE DATABASE
    await admin.unsafe(`CREATE DATABASE ${TEST_DB}`);
  }
  admin.close();

  testSql = new SQL(
    `postgres://${PG_USER}:${PG_PASS}@${PG_HOST}:${PG_PORT}/${TEST_DB}`,
  );
  return testSql;
}

/**
 * Set up the full schema in the test database.
 * Drops existing objects first for idempotency.
 */
export async function setupSchema(
  sql: InstanceType<typeof SQL>,
): Promise<void> {
  // Drop tables in reverse dependency order
  await sql.unsafe(`
    DROP TABLE IF EXISTS drop_products CASCADE;
    DROP TABLE IF EXISTS order_items CASCADE;
    DROP TABLE IF EXISTS orders CASCADE;
    DROP TABLE IF EXISTS drops CASCADE;
    DROP TABLE IF EXISTS products CASCADE;
    DROP TYPE IF EXISTS drop_status CASCADE;
    DROP TYPE IF EXISTS order_status CASCADE;
  `);

  // Create types
  await sql.unsafe(`
    CREATE TYPE drop_status AS ENUM ('upcoming', 'active', 'sold_out', 'in_the_oven', 'ended')
  `);
  await sql.unsafe(`
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'cancelled', 'refunded')
  `);

  // Create tables
  await sql.unsafe(`
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      ingredients TEXT,
      price DECIMAL(10, 2) NOT NULL,
      image_url VARCHAR(500),
      product_type VARCHAR(50) NOT NULL DEFAULT 'granola',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sql.unsafe(`
    CREATE TABLE drops (
      id SERIAL PRIMARY KEY,
      display_name VARCHAR(100) NOT NULL,
      year INT NOT NULL,
      status drop_status NOT NULL DEFAULT 'upcoming',
      max_capacity INT NOT NULL DEFAULT 50,
      sold_count INT NOT NULL DEFAULT 0,
      start_date DATE,
      end_date DATE,
      prep_date DATE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sql.unsafe(`
    CREATE TABLE orders (
      id SERIAL PRIMARY KEY,
      stripe_session_id VARCHAR(255) UNIQUE,
      stripe_payment_intent VARCHAR(255),
      customer_email VARCHAR(255),
      total_amount DECIMAL(10, 2) NOT NULL,
      status order_status NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await sql.unsafe(`
    CREATE TABLE order_items (
      id SERIAL PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      drop_id INT NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE RESTRICT
    )
  `);

  await sql.unsafe(`
    CREATE TABLE drop_products (
      id SERIAL PRIMARY KEY,
      drop_id INT NOT NULL,
      product_id INT NOT NULL,
      max_capacity INT NOT NULL DEFAULT 10,
      sold_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
      UNIQUE(drop_id, product_id)
    )
  `);
}

/**
 * Truncate all tables, resetting sequences. Use in beforeEach.
 */
export async function truncateAll(
  sql: InstanceType<typeof SQL>,
): Promise<void> {
  await sql.unsafe(`
    TRUNCATE TABLE drop_products, order_items, orders, drops, products
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Close the test database connection.
 */
export async function teardown(sql: InstanceType<typeof SQL>): Promise<void> {
  sql.close();
  testSql = null;
}

/**
 * Seed a standard set of products for tests that need FK references.
 */
export async function seedProducts(
  sql: InstanceType<typeof SQL>,
): Promise<void> {
  await sql`
    INSERT INTO products (slug, name, description, ingredients, price, image_url, product_type) VALUES
      ('peanut-butter-chocolate-chip', 'Peanut Butter Chocolate Chip', 'Desc', 'Ingredients', 12.00, '/images/pb.jpg', 'granola'),
      ('honey-bear', 'Honey Bear', 'Desc', 'Ingredients', 12.00, '/images/hb.jpg', 'granola'),
      ('pistachio', 'Pistachio', 'Desc', 'Ingredients', 14.00, '/images/pi.jpg', 'granola'),
      ('trail-mix', 'Trail Mix', 'Desc', 'Ingredients', 10.00, '/images/tm.jpg', 'mix')
  `;
}

/**
 * Seed a standard drop for tests that need FK references.
 * Returns the drop ID.
 */
export async function seedDrop(
  sql: InstanceType<typeof SQL>,
  overrides: {
    display_name?: string;
    year?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  } = {},
): Promise<number> {
  const name = overrides.display_name ?? "January";
  const year = overrides.year ?? 2026;
  const status = overrides.status ?? "upcoming";
  const startDate = overrides.start_date ?? "2026-01-01";
  const endDate = overrides.end_date ?? "2026-01-31";

  const rows = await sql`
    INSERT INTO drops (display_name, year, status, start_date, end_date)
    VALUES (${name}, ${year}, ${status}, ${startDate}, ${endDate})
    RETURNING id
  `;
  return (rows[0] as { id: number }).id;
}

// Date helpers
export function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0]; // YYYY-MM-DD for DATE columns
}

export function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split("T")[0];
}

/**
 * Returns a full ISO timestamp for use with getCurrentDrop comparisons.
 */
export function futureTimestamp(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

export function pastTimestamp(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

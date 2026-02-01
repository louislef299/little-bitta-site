import { SQL } from "bun";
import { dev } from "$app/environment";
import { DATABASE_URL } from "$env/static/private";

export const sql = dev ? new SQL(":memory:") : new SQL(DATABASE_URL);

// Initialize dev database with schema and seed data
export async function initDevDb() {
  if (!dev) {
    console.info("server is in production mode, skipping db init");
    return;
  }

  console.warn("server is in dev mode, initializing db");
  // Create table (SQLite syntax)
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      ingredients TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      product_type TEXT NOT NULL DEFAULT 'granola'
    )
  `;

  // Seed data from config/init-db/02-seed.sql
  const existing = await sql`SELECT COUNT(*) as count FROM products`;
  if (existing[0].count === 0) {
    await sql`INSERT INTO products (slug, name, description, ingredients, price, image_url, product_type) VALUES
      ('peanut-butter-chocolate-chip', 'Peanut Butter Chocolate Chip', 'Rich, creamy peanut butter granola studded with generous chocolate chips. A perfect balance of salty and sweet that makes breakfast feel like dessert.', 'Rolled oats, peanut butter, chocolate chips, honey, coconut oil, brown sugar, vanilla extract, sea salt', 12.00, '/images/granola-generic.jpg', 'granola'),
      ('peanut-butter-nutella', 'Peanut Butter Nutella', 'The ultimate indulgence - smooth peanut butter meets rich hazelnut chocolate spread in every crunchy cluster. Warning: highly addictive.', 'Rolled oats, peanut butter, Nutella, honey, coconut oil, hazelnuts, cocoa powder, vanilla extract', 12.00, '/images/granola-generic.jpg', 'granola'),
      ('honey-bear', 'Honey Bear', 'Sweet golden honey kissed granola with a gentle warmth. Simple, classic, and perfectly balanced for those who appreciate the pure taste of nature.', 'Rolled oats, local honey, sliced almonds, coconut oil, vanilla extract, cinnamon, sea salt', 12.00, '/images/granola-generic.jpg', 'granola'),
      ('pistachio', 'Pistachio', 'Elegant and nutty with generous chunks of premium pistachios throughout. A sophisticated granola for the discerning palate.', 'Rolled oats, roasted pistachios, honey, coconut oil, almond extract, cardamom, sea salt', 12.00, '/images/granola-generic.jpg', 'granola')
    `;
  }

  // Create drops table (SQLite syntax)
  await sql`
    CREATE TABLE IF NOT EXISTS drops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'active', 'sold_out', 'ended')),
      start_date TEXT,
      end_date TEXT,
      prep_date TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Seed drops data
  const existingDrops = await sql`SELECT COUNT(*) as count FROM drops`;
  if (existingDrops[0].count === 0) {
    await sql`INSERT INTO drops (display_name, year, status, description, start_date, end_date, prep_date) VALUES
      ('January', 2026, 'upcoming', 'Start the new year with delicious granola!', '2026-01-01', '2026-01-31', '2026-02-12'),
      ('February', 2026, 'upcoming', 'Valentine special coming soon!', '2026-02-01', '2026-02-28', '2026-03-12')
    `;
  }

  // Create orders table (SQLite syntax)
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      stripe_session_id TEXT UNIQUE,
      stripe_payment_intent TEXT,
      customer_email TEXT,
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create order_items table (SQLite syntax)
  await sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      drop_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (drop_id) REFERENCES drops(id)
    )
  `;

  // Create drop_products table for per-product capacity tracking
  await sql`
    CREATE TABLE IF NOT EXISTS drop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drop_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      max_capacity INTEGER NOT NULL DEFAULT 10,
      sold_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (drop_id) REFERENCES drops(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE(drop_id, product_id)
    )
  `;

  // Seed drop_products with varied capacities for January drop
  const existingDropProducts =
    await sql`SELECT COUNT(*) as count FROM drop_products`;
  if (existingDropProducts[0].count === 0) {
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count) VALUES
      (1, 1, 25, 22),  -- PB Chocolate Chip: 3 left
      (1, 2, 25, 0),   -- PB Nutella: 25 left  
      (1, 3, 15, 15),  -- Honey Bear: SOLD OUT
      (1, 4, 10, 2)    -- Pistachio: 8 left
    `;
  }

  // Seed sample orders for dev testing
  const existingOrders = await sql`SELECT COUNT(*) as count FROM orders`;
  if (existingOrders[0].count === 0) {
    // Order 1: Confirmed order with 2 items
    await sql`INSERT INTO orders (stripe_session_id, stripe_payment_intent, customer_email, total_amount, status)
      VALUES ('cs_test_sample_001', 'pi_test_sample_001', 'alice@example.com', 36.00, 'confirmed')`;
    await sql`INSERT INTO order_items (order_id, product_id, drop_id, quantity, unit_price) VALUES
      (1, 1, 1, 2, 12.00),
      (1, 3, 1, 1, 12.00)`;

    // Order 2: Confirmed order with 1 item
    await sql`INSERT INTO orders (stripe_session_id, stripe_payment_intent, customer_email, total_amount, status)
      VALUES ('cs_test_sample_002', 'pi_test_sample_002', 'bob@example.com', 24.00, 'confirmed')`;
    await sql`INSERT INTO order_items (order_id, product_id, drop_id, quantity, unit_price) VALUES
      (2, 2, 1, 2, 12.00)`;

    // Order 3: Confirmed order with multiple items
    await sql`INSERT INTO orders (stripe_session_id, stripe_payment_intent, customer_email, total_amount, status)
      VALUES ('cs_test_sample_003', 'pi_test_sample_003', 'carol@example.com', 48.00, 'confirmed')`;
    await sql`INSERT INTO order_items (order_id, product_id, drop_id, quantity, unit_price) VALUES
      (3, 4, 1, 3, 12.00),
      (3, 1, 1, 1, 12.00)`;

    // Order 4: Pending order (should NOT count toward capacity)
    await sql`INSERT INTO orders (stripe_session_id, customer_email, total_amount, status)
      VALUES ('cs_test_sample_004', 'dave@example.com', 12.00, 'pending')`;
    await sql`INSERT INTO order_items (order_id, product_id, drop_id, quantity, unit_price) VALUES
      (4, 3, 1, 1, 12.00)`;

    // Order 5: Cancelled order (should NOT count toward capacity)
    await sql`INSERT INTO orders (stripe_session_id, stripe_payment_intent, customer_email, total_amount, status)
      VALUES ('cs_test_sample_005', 'pi_test_sample_005', 'eve@example.com', 24.00, 'cancelled')`;
    await sql`INSERT INTO order_items (order_id, product_id, drop_id, quantity, unit_price) VALUES
      (5, 2, 1, 2, 12.00)`;
  }
}

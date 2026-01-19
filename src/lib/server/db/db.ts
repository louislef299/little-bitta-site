import { SQL } from "bun";
import { dev } from "$app/environment";
import { DATABASE_URL } from "$env/static/private";

export const sql = dev ? new SQL(":memory:") : new SQL(DATABASE_URL);

// Initialize dev database with schema and seed data
export async function initDevDb() {
  if (!dev) {
    console.info("server is in production mode, skipping db init")
    return;
  }

  console.warn("server is in dev mode, initializing db")
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
}

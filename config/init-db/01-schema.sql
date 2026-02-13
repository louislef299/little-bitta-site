-- Products table
CREATE TABLE IF NOT EXISTS products (
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
);

-- Drops table (limited release periods)
CREATE TYPE drop_status AS ENUM ('upcoming', 'active', 'sold_out', 'ended');
CREATE TABLE IF NOT EXISTS drops (
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
);

-- Orders table (completed purchases)
CREATE TYPE order_status AS ENUM('pending', 'confirmed', 'cancelled', 'refunded');
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  stripe_session_id VARCHAR(255) UNIQUE,
  stripe_payment_intent VARCHAR(255),
  customer_email VARCHAR(255),
  total_amount DECIMAL(10, 2) NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table (line items in an order)
CREATE TABLE IF NOT EXISTS order_items (
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
);

-- Indexes for capacity queries
CREATE INDEX idx_order_items_drop ON order_items(drop_id);
CREATE INDEX idx_orders_status ON orders(status);

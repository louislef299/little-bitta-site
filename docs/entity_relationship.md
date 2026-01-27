# Entity Relationship Documentation

## Overview

This document describes the database schema for the Little Bitta Granola e-commerce site. The database uses SQLite (in-memory for development, file-based for production via `DATABASE_URL`).

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    products     │       │     drops       │       │     orders      │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ slug (UNIQUE)   │       │ display_name    │       │ stripe_session  │
│ name            │       │ year            │       │ stripe_payment  │
│ description     │       │ status          │       │ customer_email  │
│ ingredients     │       │ start_date      │       │ total_amount    │
│ price           │       │ end_date        │       │ status          │
│ image_url       │       │ description     │       │ created_at      │
│ product_type    │       │ created_at      │       │ updated_at      │
└────────┬────────┘       │ updated_at      │       └────────┬────────┘
         │                └────────┬────────┘                │
         │                         │                         │
         │    ┌────────────────────┼────────────────────┐    │
         │    │                    │                    │    │
         ▼    ▼                    ▼                    ▼    ▼
┌─────────────────────┐    ┌─────────────────────────────────────┐
│   drop_products     │    │           order_items               │
├─────────────────────┤    ├─────────────────────────────────────┤
│ id (PK)             │    │ id (PK)                             │
│ drop_id (FK)        │────│ order_id (FK) ──────────────────────│
│ product_id (FK)     │    │ product_id (FK)                     │
│ max_capacity        │    │ drop_id (FK)                        │
│ sold_count          │    │ quantity                            │
│ created_at          │    │ unit_price                          │
│ updated_at          │    │ created_at                          │
│ UNIQUE(drop,product)│    └─────────────────────────────────────┘
└─────────────────────┘
```

## Tables

### products

The product catalog - granola flavors available for sale.

| Column         | Type    | Constraints                 | Description                                                    |
| -------------- | ------- | --------------------------- | -------------------------------------------------------------- |
| `id`           | INTEGER | PRIMARY KEY, AUTOINCREMENT  | Unique identifier                                              |
| `slug`         | TEXT    | NOT NULL, UNIQUE            | URL-friendly identifier (e.g., `peanut-butter-chocolate-chip`) |
| `name`         | TEXT    | NOT NULL                    | Display name                                                   |
| `description`  | TEXT    |                             | Product description                                            |
| `ingredients`  | TEXT    |                             | Comma-separated ingredients list                               |
| `price`        | REAL    | NOT NULL                    | Price per unit (in dollars)                                    |
| `image_url`    | TEXT    |                             | Path to product image                                          |
| `product_type` | TEXT    | NOT NULL, DEFAULT 'granola' | Product category                                               |

### drops

Limited-time inventory releases. Only one drop can be `active` at a time.

| Column         | Type    | Constraints                         | Description                                       |
| -------------- | ------- | ----------------------------------- | ------------------------------------------------- |
| `id`           | INTEGER | PRIMARY KEY, AUTOINCREMENT          | Unique identifier                                 |
| `display_name` | TEXT    | NOT NULL                            | Human-readable name (e.g., "January")             |
| `year`         | INTEGER | NOT NULL                            | Year of the drop                                  |
| `status`       | TEXT    | NOT NULL, DEFAULT 'upcoming', CHECK | One of: `upcoming`, `active`, `sold_out`, `ended` |
| `start_date`   | TEXT    |                                     | ISO date when drop becomes active                 |
| `end_date`     | TEXT    |                                     | ISO date when drop ends                           |
| `description`  | TEXT    |                                     | Marketing description                             |
| `created_at`   | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Record creation time                              |
| `updated_at`   | TEXT    | DEFAULT CURRENT_TIMESTAMP           | Last update time                                  |

**Note:** Drop capacity is **calculated** from the sum of `drop_products` entries, not stored directly on the drops table.

**Status Transitions:**

```
upcoming → active → sold_out
                 → ended
```

### drop_products

Junction table for per-product capacity within a drop. **This is the source of truth for inventory tracking.**

| Column         | Type    | Constraints                | Description                                |
| -------------- | ------- | -------------------------- | ------------------------------------------ |
| `id`           | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier                          |
| `drop_id`      | INTEGER | NOT NULL, FOREIGN KEY      | References `drops.id`                      |
| `product_id`   | INTEGER | NOT NULL, FOREIGN KEY      | References `products.id`                   |
| `max_capacity` | INTEGER | NOT NULL, DEFAULT 10       | Max quantity for this product in this drop |
| `sold_count`   | INTEGER | NOT NULL, DEFAULT 0        | Quantity sold                              |
| `created_at`   | TEXT    | DEFAULT CURRENT_TIMESTAMP  | Record creation time                       |
| `updated_at`   | TEXT    | DEFAULT CURRENT_TIMESTAMP  | Last update time                           |

**Constraints:**

- `UNIQUE(drop_id, product_id)` - Each product can only appear once per drop

### orders

Customer orders, linked to Stripe checkout sessions.

| Column                  | Type    | Constraints                        | Description                                             |
| ----------------------- | ------- | ---------------------------------- | ------------------------------------------------------- |
| `id`                    | INTEGER | PRIMARY KEY, AUTOINCREMENT         | Unique identifier                                       |
| `stripe_session_id`     | TEXT    | UNIQUE                             | Stripe Checkout Session ID (`cs_...`)                   |
| `stripe_payment_intent` | TEXT    |                                    | Stripe PaymentIntent ID (`pi_...`)                      |
| `customer_email`        | TEXT    |                                    | Customer's email address                                |
| `total_amount`          | REAL    | NOT NULL                           | Order total in dollars                                  |
| `status`                | TEXT    | NOT NULL, DEFAULT 'pending', CHECK | One of: `pending`, `confirmed`, `cancelled`, `refunded` |
| `created_at`            | TEXT    | DEFAULT CURRENT_TIMESTAMP          | Record creation time                                    |
| `updated_at`            | TEXT    | DEFAULT CURRENT_TIMESTAMP          | Last update time                                        |

**Status Meanings:**

- `pending` - Checkout started but not completed
- `confirmed` - Payment successful
- `cancelled` - Order cancelled (session expired or user abandoned)
- `refunded` - Payment refunded

### order_items

Line items within an order. Each row represents one product in the order.

| Column       | Type    | Constraints                | Description                             |
| ------------ | ------- | -------------------------- | --------------------------------------- |
| `id`         | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique identifier                       |
| `order_id`   | INTEGER | NOT NULL, FOREIGN KEY      | References `orders.id` (CASCADE DELETE) |
| `product_id` | INTEGER | NOT NULL, FOREIGN KEY      | References `products.id`                |
| `drop_id`    | INTEGER | NOT NULL, FOREIGN KEY      | References `drops.id`                   |
| `quantity`   | INTEGER | NOT NULL                   | Number of units ordered                 |
| `unit_price` | REAL    | NOT NULL                   | Price per unit at time of order         |
| `created_at` | TEXT    | DEFAULT CURRENT_TIMESTAMP  | Record creation time                    |

## Relationships

### One-to-Many

| Parent     | Child           | Relationship                                |
| ---------- | --------------- | ------------------------------------------- |
| `orders`   | `order_items`   | One order has many line items               |
| `products` | `order_items`   | One product can appear in many order items  |
| `drops`    | `order_items`   | One drop can have many order items          |
| `products` | `drop_products` | One product can have capacity in many drops |
| `drops`    | `drop_products` | One drop can have many product capacities   |

### Many-to-Many (via Junction Tables)

| Entity A   | Entity B   | Junction Table  | Description                                   |
| ---------- | ---------- | --------------- | --------------------------------------------- |
| `products` | `drops`    | `drop_products` | Products available in each drop with capacity |
| `orders`   | `products` | `order_items`   | Products purchased in each order              |

## Capacity Tracking

### Single Source of Truth: `drop_products`

All capacity tracking flows through the `drop_products` table:

- **Per-product capacity**: `drop_products.max_capacity` and `drop_products.sold_count`
- **Drop-level capacity**: Calculated as `SUM(max_capacity)` and `SUM(sold_count)` from `drop_products`

This design ensures:

1. Per-product availability is always accurate
2. Drop-level totals are always consistent with per-product data
3. No synchronization issues between separate counters

### Capacity Calculation

```sql
-- Drop-level capacity (calculated)
SELECT
  COALESCE(SUM(max_capacity), 0) as total_max,
  COALESCE(SUM(sold_count), 0) as total_sold
FROM drop_products
WHERE drop_id = ?;

-- Available = total_max - total_sold
```

### Capacity Update Flow

```
Payment Confirmed (Webhook)
         │
         ▼
┌─────────────────────────────────┐
│ For each line item:             │
│   Update drop_products.sold_count│  ← Source of truth
│   (item quantity)               │
└───────────────────┬─────────────┘
                    │
                    ▼
┌─────────────────────────────────┐
│ Calculate drop capacity         │
│ (SUM from drop_products)        │
│                                 │
│ If available <= 0:              │
│   Update drops.status = sold_out│
└─────────────────────────────────┘
```

## Example Queries

### Get available products for current drop

```sql
SELECT p.*, dp.max_capacity, dp.sold_count,
       (dp.max_capacity - dp.sold_count) as available
FROM products p
LEFT JOIN drop_products dp ON p.id = dp.product_id
LEFT JOIN drops d ON dp.drop_id = d.id
WHERE d.status = 'active'
ORDER BY p.name;
```

### Get drop capacity (calculated)

```sql
SELECT
  d.id,
  d.display_name,
  COALESCE(SUM(dp.max_capacity), 0) as total_max,
  COALESCE(SUM(dp.sold_count), 0) as total_sold,
  COALESCE(SUM(dp.max_capacity), 0) - COALESCE(SUM(dp.sold_count), 0) as available
FROM drops d
LEFT JOIN drop_products dp ON d.id = dp.drop_id
WHERE d.status = 'active'
GROUP BY d.id;
```

### Get order with items

```sql
SELECT o.*, oi.quantity, oi.unit_price,
       p.name as product_name, d.display_name as drop_name
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
JOIN drops d ON oi.drop_id = d.id
WHERE o.id = ?;
```

### Check product availability

```sql
SELECT (dp.max_capacity - dp.sold_count) as available
FROM drop_products dp
JOIN drops d ON dp.drop_id = d.id
WHERE d.status = 'active'
  AND dp.product_id = ?;
```

## Database Files

| File                                | Purpose                                                      |
| ----------------------------------- | ------------------------------------------------------------ |
| `src/lib/server/db/db.ts`           | Connection setup, schema creation, seed data                 |
| `src/lib/server/db/product.ts`      | Product queries                                              |
| `src/lib/server/db/drop.ts`         | Drop queries, calculated drop-level capacity                 |
| `src/lib/server/db/drop-product.ts` | Per-product capacity queries (source of truth for inventory) |
| `src/lib/server/db/order.ts`        | Order and order item queries                                 |

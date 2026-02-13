import { sql } from "./db";

export interface DropProduct {
  id: number;
  drop_id: number;
  product_id: number;
  max_capacity: number;
  sold_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductCapacity {
  product_id: number;
  max: number;
  sold: number;
  available: number;
}

// Default capacity when no drop_products entry exists
const DEFAULT_MAX_CAPACITY = 10;

// Get capacity for a specific product in a drop
export async function getProductCapacity(
  dropId: number,
  productId: number,
): Promise<ProductCapacity> {
  const rows = await sql`
    SELECT product_id, max_capacity, sold_count
    FROM drop_products
    WHERE drop_id = ${dropId} AND product_id = ${productId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    // Return zero capacity if no entry exists - product not configured for this drop
    return {
      product_id: productId,
      max: 0,
      sold: 0,
      available: 0,
    };
  }

  const row = rows[0] as {
    product_id: number;
    max_capacity: number;
    sold_count: number;
  };
  return {
    product_id: row.product_id,
    max: row.max_capacity,
    sold: row.sold_count,
    available: row.max_capacity - row.sold_count,
  };
}

// Get all product capacities for a drop (for shop page)
// Returns a Map for easy lookup by product_id
export async function getDropProductCapacities(
  dropId: number,
): Promise<Map<number, ProductCapacity>> {
  const rows = await sql`
    SELECT product_id, max_capacity, sold_count
    FROM drop_products
    WHERE drop_id = ${dropId}
  `;

  const capacities = new Map<number, ProductCapacity>();
  for (const row of rows as {
    product_id: number;
    max_capacity: number;
    sold_count: number;
  }[]) {
    capacities.set(row.product_id, {
      product_id: row.product_id,
      max: row.max_capacity,
      sold: row.sold_count,
      available: row.max_capacity - row.sold_count,
    });
  }

  return capacities;
}

// Update sold_count for a product (called from webhook)
// Positive quantity increases sold count, negative decreases
export async function updateProductCapacity(
  dropId: number,
  productId: number,
  quantity: number,
): Promise<ProductCapacity> {
  // Upsert: insert if not exists, update if exists
  const existing = await sql`
    SELECT id FROM drop_products
    WHERE drop_id = ${dropId} AND product_id = ${productId}
    LIMIT 1
  `;

  if (existing.length === 0) {
    // Product not configured for this drop - this is an error
    throw new Error(
      `Cannot update capacity for product ${productId} in drop ${dropId}: ` +
        `product not configured in drop_products table`,
    );
  }

  // Update existing row
  await sql`
    UPDATE drop_products
    SET sold_count = sold_count + ${quantity},
        updated_at = CURRENT_TIMESTAMP
    WHERE drop_id = ${dropId} AND product_id = ${productId}
  `;

  return getProductCapacity(dropId, productId);
}

// Check if product is available in a drop
export async function isProductAvailable(
  dropId: number,
  productId: number,
): Promise<boolean> {
  const capacity = await getProductCapacity(dropId, productId);
  return capacity.available > 0;
}

// Create or update a drop_products entry (for admin use)
export async function setProductCapacity(
  dropId: number,
  productId: number,
  maxCapacity: number,
  soldCount: number = 0,
): Promise<void> {
  const existing = await sql`
    SELECT id FROM drop_products
    WHERE drop_id = ${dropId} AND product_id = ${productId}
    LIMIT 1
  `;

  if (existing.length === 0) {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productId}, ${maxCapacity}, ${soldCount})
    `;
  } else {
    await sql`
      UPDATE drop_products
      SET max_capacity = ${maxCapacity},
          sold_count = ${soldCount},
          updated_at = DEFAULT
      WHERE drop_id = ${dropId} AND product_id = ${productId}
    `;
  }
}

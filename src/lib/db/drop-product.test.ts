import { SQL } from "bun";
import { describe, test, expect, beforeEach, mock } from "bun:test";

// Mock the db module to use an in-memory SQLite database for tests
const sql = new SQL(":memory:");
mock.module("./db", () => ({ sql }));

const { getProductCapacity, updateProductCapacity } =
  await import("./drop-product");

async function setupTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS drop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      drop_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      max_capacity INTEGER NOT NULL DEFAULT 10,
      sold_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(drop_id, product_id)
    )
  `;
}

async function clearTables() {
  await sql`DELETE FROM drop_products`;
}

describe("getProductCapacity", () => {
  beforeEach(async () => {
    await setupTables();
    await clearTables();
  });

  test("returns correct capacity for existing product", async () => {
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (1, 100, 15, 5)`;

    const capacity = await getProductCapacity(1, 100);
    expect(capacity.product_id).toBe(100);
    expect(capacity.max).toBe(15);
    expect(capacity.sold).toBe(5);
    expect(capacity.available).toBe(10);
  });

  test("returns zero capacity for product not in drop", async () => {
    const capacity = await getProductCapacity(1, 999);
    expect(capacity.product_id).toBe(999);
    expect(capacity.max).toBe(0);
    expect(capacity.sold).toBe(0);
    expect(capacity.available).toBe(0);
  });

  test("returns zero available when product is sold out", async () => {
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (1, 200, 10, 10)`;

    const capacity = await getProductCapacity(1, 200);
    expect(capacity.available).toBe(0);
  });

  test("calculates available correctly with partial sales", async () => {
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (2, 300, 20, 7)`;

    const capacity = await getProductCapacity(2, 300);
    expect(capacity.available).toBe(13);
  });
});

describe("updateProductCapacity", () => {
  beforeEach(async () => {
    await setupTables();
    await clearTables();
  });

  test("increments sold_count for existing product", async () => {
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (1, 100, 15, 5)`;

    await updateProductCapacity(1, 100, 3);

    const capacity = await getProductCapacity(1, 100);
    expect(capacity.sold).toBe(8);
    expect(capacity.available).toBe(7);
  });

  test("decrements sold_count with negative quantity", async () => {
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (1, 100, 15, 8)`;

    await updateProductCapacity(1, 100, -3);

    const capacity = await getProductCapacity(1, 100);
    expect(capacity.sold).toBe(5);
    expect(capacity.available).toBe(10);
  });

  test("throws error when updating unconfigured product", async () => {
    expect(async () => {
      await updateProductCapacity(1, 999, 5);
    }).toThrow();
  });

  test("allows sold_count to exceed max_capacity (intentional overbooking)", async () => {
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (1, 100, 10, 9)`;

    await updateProductCapacity(1, 100, 5);

    const capacity = await getProductCapacity(1, 100);
    expect(capacity.sold).toBe(14);
    expect(capacity.available).toBe(-4);
  });
});

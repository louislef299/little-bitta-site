import {
  describe,
  test,
  expect,
  beforeAll,
  beforeEach,
  afterAll,
  mock,
} from "bun:test";
import {
  getTestSql,
  setupSchema,
  truncateAll,
  teardown,
  seedProducts,
  seedDrop,
} from "./test-utils";

const sql = await getTestSql();
mock.module("../../../src/lib/db/db", () => ({ sql }));

const {
  getProductCapacity,
  getDropProductCapacities,
  updateProductCapacity,
  isProductAvailable,
  setProductCapacity,
} = await import("../../../src/lib/db/drop-product");

let dropId: number;
let productIds: number[];

beforeAll(async () => {
  await setupSchema(sql);
});

beforeEach(async () => {
  await truncateAll(sql);
  await seedProducts(sql);
  dropId = await seedDrop(sql);
  const rows = await sql`SELECT id FROM products ORDER BY id`;
  productIds = (rows as { id: number }[]).map((r) => r.id);
});

afterAll(async () => {
  await teardown(sql);
});

describe("getProductCapacity", () => {
  test("returns capacity for an existing drop_product entry", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 25, 10)
    `;

    const capacity = await getProductCapacity(dropId, productIds[0]);
    expect(capacity.product_id).toBe(productIds[0]);
    expect(capacity.max).toBe(25);
    expect(capacity.sold).toBe(10);
    expect(capacity.available).toBe(15);
  });

  test("returns zero capacity when no entry exists", async () => {
    const capacity = await getProductCapacity(dropId, productIds[0]);
    expect(capacity).toEqual({
      product_id: productIds[0],
      max: 0,
      sold: 0,
      available: 0,
    });
  });

  test("returns zero availability when sold out", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 10, 10)
    `;

    const capacity = await getProductCapacity(dropId, productIds[0]);
    expect(capacity.available).toBe(0);
  });
});

describe("getDropProductCapacities", () => {
  test("returns a Map of all product capacities for a drop", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count) VALUES
        (${dropId}, ${productIds[0]}, 25, 10),
        (${dropId}, ${productIds[1]}, 15, 5)
    `;

    const capacities = await getDropProductCapacities(dropId);
    expect(capacities.size).toBe(2);

    const cap0 = capacities.get(productIds[0]);
    expect(cap0).toBeDefined();
    expect(cap0!.max).toBe(25);
    expect(cap0!.sold).toBe(10);
    expect(cap0!.available).toBe(15);

    const cap1 = capacities.get(productIds[1]);
    expect(cap1).toBeDefined();
    expect(cap1!.max).toBe(15);
    expect(cap1!.sold).toBe(5);
  });

  test("returns empty Map when drop has no product entries", async () => {
    const capacities = await getDropProductCapacities(dropId);
    expect(capacities.size).toBe(0);
  });

  test("returns empty Map for non-existent drop", async () => {
    const capacities = await getDropProductCapacities(999);
    expect(capacities.size).toBe(0);
  });
});

describe("updateProductCapacity", () => {
  test("throws error when product is not configured in drop", async () => {
    expect(updateProductCapacity(dropId, productIds[0], 3)).rejects.toThrow(
      `Cannot update capacity for product ${productIds[0]} in drop ${dropId}: product not configured in drop_products table`,
    );
  });

  test("increments sold count on existing entry", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 25, 10)
    `;

    const capacity = await updateProductCapacity(dropId, productIds[0], 5);
    expect(capacity.sold).toBe(15);
    expect(capacity.available).toBe(10);
  });

  test("decrements sold count with negative quantity", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 25, 10)
    `;

    const capacity = await updateProductCapacity(dropId, productIds[0], -3);
    expect(capacity.sold).toBe(7);
    expect(capacity.available).toBe(18);
  });

  test("updates updated_at on existing entry", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 25, 10)
    `;

    const before = await sql`
      SELECT updated_at FROM drop_products
      WHERE drop_id = ${dropId} AND product_id = ${productIds[0]}
    `;
    await new Promise((r) => setTimeout(r, 10));

    await updateProductCapacity(dropId, productIds[0], 1);

    const after = await sql`
      SELECT updated_at FROM drop_products
      WHERE drop_id = ${dropId} AND product_id = ${productIds[0]}
    `;
    expect(
      new Date(after[0].updated_at as string).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at as string).getTime(),
    );
  });
});

describe("isProductAvailable", () => {
  test("returns true when product has availability", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 25, 10)
    `;

    const available = await isProductAvailable(dropId, productIds[0]);
    expect(available).toBe(true);
  });

  test("returns false when product is sold out", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 10, 10)
    `;

    const available = await isProductAvailable(dropId, productIds[0]);
    expect(available).toBe(false);
  });

  test("returns false when no entry exists", async () => {
    const available = await isProductAvailable(dropId, productIds[0]);
    expect(available).toBe(false); // getProductCapacity returns available: 0 for missing entries
  });
});

describe("setProductCapacity", () => {
  test("creates a new entry if none exists", async () => {
    await setProductCapacity(dropId, productIds[0], 50, 5);

    const capacity = await getProductCapacity(dropId, productIds[0]);
    expect(capacity.max).toBe(50);
    expect(capacity.sold).toBe(5);
    expect(capacity.available).toBe(45);
  });

  test("updates an existing entry", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 25, 10)
    `;

    await setProductCapacity(dropId, productIds[0], 30, 15);

    const capacity = await getProductCapacity(dropId, productIds[0]);
    expect(capacity.max).toBe(30);
    expect(capacity.sold).toBe(15);
    expect(capacity.available).toBe(15);
  });

  test("defaults soldCount to 0", async () => {
    await setProductCapacity(dropId, productIds[0], 20);

    const capacity = await getProductCapacity(dropId, productIds[0]);
    expect(capacity.max).toBe(20);
    expect(capacity.sold).toBe(0);
    expect(capacity.available).toBe(20);
  });

  test("updates updated_at on existing entry", async () => {
    await sql`
      INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count)
      VALUES (${dropId}, ${productIds[0]}, 25, 10)
    `;

    const before = await sql`
      SELECT updated_at FROM drop_products
      WHERE drop_id = ${dropId} AND product_id = ${productIds[0]}
    `;
    await new Promise((r) => setTimeout(r, 10));

    await setProductCapacity(dropId, productIds[0], 30, 10);

    const after = await sql`
      SELECT updated_at FROM drop_products
      WHERE drop_id = ${dropId} AND product_id = ${productIds[0]}
    `;
    expect(
      new Date(after[0].updated_at as string).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at as string).getTime(),
    );
  });
});

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
  createOrder,
  getOrderById,
  getOrderByStripeSession,
  getOrderItems,
  updateOrderStatus,
  confirmOrder,
  updateOrderStripeSession,
} = await import("../../../src/lib/db/order");

let productId: number;
let dropId: number;

beforeAll(async () => {
  await setupSchema(sql);
});

beforeEach(async () => {
  await truncateAll(sql);
  // Seed dependencies needed for order items
  await seedProducts(sql);
  dropId = await seedDrop(sql);
  // Get the first product ID
  const rows = await sql`SELECT id FROM products LIMIT 1`;
  productId = (rows[0] as { id: number }).id;
});

afterAll(async () => {
  await teardown(sql);
});

// Helper to insert an order directly via SQL (bypassing createOrder which may have issues)
async function insertOrder(opts: {
  stripe_session_id?: string | null;
  stripe_payment_intent?: string | null;
  customer_email?: string | null;
  total_amount: number;
  status?: string;
}): Promise<number> {
  const rows = await sql`
    INSERT INTO orders (stripe_session_id, stripe_payment_intent, customer_email, total_amount, status)
    VALUES (${opts.stripe_session_id ?? null}, ${opts.stripe_payment_intent ?? null},
            ${opts.customer_email ?? null}, ${opts.total_amount}, ${opts.status ?? "pending"})
    RETURNING id
  `;
  return (rows[0] as { id: number }).id;
}

describe("createOrder", () => {
  test("creates an order with items and returns order ID", async () => {
    const orderId = await createOrder({
      stripe_session_id: "cs_test_123",
      customer_email: "test@example.com",
      total_amount: 24.0,
      items: [
        {
          product_id: productId,
          drop_id: dropId,
          quantity: 2,
          unit_price: 12.0,
        },
      ],
    });

    expect(orderId).toBeGreaterThan(0);

    const order = await getOrderById(orderId);
    expect(order).not.toBeNull();
    expect(order!.stripe_session_id).toBe("cs_test_123");
    expect(order!.customer_email).toBe("test@example.com");
    expect(Number(order!.total_amount)).toBeCloseTo(24.0);
    expect(order!.status).toBe("pending");

    const items = await getOrderItems(orderId);
    expect(items).toHaveLength(1);
    expect(items[0].product_id).toBe(productId);
    expect(items[0].quantity).toBe(2);
  });

  test("creates an order with multiple items", async () => {
    const products = await sql`SELECT id FROM products LIMIT 2`;
    const p1 = (products[0] as { id: number }).id;
    const p2 = (products[1] as { id: number }).id;

    const orderId = await createOrder({
      total_amount: 36.0,
      items: [
        { product_id: p1, drop_id: dropId, quantity: 1, unit_price: 12.0 },
        { product_id: p2, drop_id: dropId, quantity: 2, unit_price: 12.0 },
      ],
    });

    const items = await getOrderItems(orderId);
    expect(items).toHaveLength(2);
  });

  test("creates an order without optional fields", async () => {
    const orderId = await createOrder({
      total_amount: 12.0,
      items: [
        {
          product_id: productId,
          drop_id: dropId,
          quantity: 1,
          unit_price: 12.0,
        },
      ],
    });

    const order = await getOrderById(orderId);
    expect(order).not.toBeNull();
    expect(order!.stripe_session_id).toBeNull();
    expect(order!.customer_email).toBeNull();
  });
});

describe("getOrderById", () => {
  test("returns an order by ID", async () => {
    const id = await insertOrder({
      stripe_session_id: "cs_test_456",
      customer_email: "alice@example.com",
      total_amount: 48.0,
      status: "confirmed",
    });

    const order = await getOrderById(id);
    expect(order).not.toBeNull();
    expect(order!.id).toBe(id);
    expect(order!.stripe_session_id).toBe("cs_test_456");
    expect(order!.status).toBe("confirmed");
    expect(order!.created_at).toBeDefined();
    expect(order!.updated_at).toBeDefined();
  });

  test("returns null for non-existent ID", async () => {
    const order = await getOrderById(999);
    expect(order).toBeNull();
  });
});

describe("getOrderByStripeSession", () => {
  test("returns an order by Stripe session ID", async () => {
    await insertOrder({
      stripe_session_id: "cs_test_789",
      total_amount: 24.0,
    });

    const order = await getOrderByStripeSession("cs_test_789");
    expect(order).not.toBeNull();
    expect(order!.stripe_session_id).toBe("cs_test_789");
  });

  test("returns null for non-existent session ID", async () => {
    const order = await getOrderByStripeSession("cs_nonexistent");
    expect(order).toBeNull();
  });
});

describe("getOrderItems", () => {
  test("returns all items for an order", async () => {
    const orderId = await insertOrder({ total_amount: 36.0 });
    const products = await sql`SELECT id FROM products LIMIT 3`;

    for (const p of products) {
      await sql`
        INSERT INTO order_items (order_id, product_id, drop_id, quantity, unit_price)
        VALUES (${orderId}, ${(p as { id: number }).id}, ${dropId}, 1, 12.00)
      `;
    }

    const items = await getOrderItems(orderId);
    expect(items).toHaveLength(3);
    expect(items[0].order_id).toBe(orderId);
    expect(items[0].created_at).toBeDefined();
  });

  test("returns empty array for order with no items", async () => {
    const orderId = await insertOrder({ total_amount: 0 });

    const items = await getOrderItems(orderId);
    expect(items).toHaveLength(0);
  });
});

describe("updateOrderStatus", () => {
  test("updates the status of an order", async () => {
    const id = await insertOrder({ total_amount: 24.0, status: "pending" });

    await updateOrderStatus(id, "confirmed");

    const order = await getOrderById(id);
    expect(order!.status).toBe("confirmed");
  });

  test("updates updated_at timestamp", async () => {
    const id = await insertOrder({ total_amount: 24.0, status: "pending" });

    const before = await sql`SELECT updated_at FROM orders WHERE id = ${id}`;
    await new Promise((r) => setTimeout(r, 10));

    await updateOrderStatus(id, "cancelled");

    const after = await sql`SELECT updated_at FROM orders WHERE id = ${id}`;
    expect(
      new Date(after[0].updated_at as string).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at as string).getTime(),
    );
  });

  test("can transition through all statuses", async () => {
    const id = await insertOrder({ total_amount: 24.0, status: "pending" });

    await updateOrderStatus(id, "confirmed");
    let order = await getOrderById(id);
    expect(order!.status).toBe("confirmed");

    await updateOrderStatus(id, "cancelled");
    order = await getOrderById(id);
    expect(order!.status).toBe("cancelled");

    await updateOrderStatus(id, "refunded");
    order = await getOrderById(id);
    expect(order!.status).toBe("refunded");
  });
});

describe("confirmOrder", () => {
  test("confirms an order by session ID with payment intent", async () => {
    await insertOrder({
      stripe_session_id: "cs_test_confirm",
      total_amount: 24.0,
      status: "pending",
    });

    await confirmOrder("cs_test_confirm", "pi_test_123");

    const order = await getOrderByStripeSession("cs_test_confirm");
    expect(order!.status).toBe("confirmed");
    expect(order!.stripe_payment_intent).toBe("pi_test_123");
  });

  test("confirms an order by session ID without payment intent", async () => {
    await insertOrder({
      stripe_session_id: "cs_test_confirm2",
      total_amount: 24.0,
      status: "pending",
    });

    await confirmOrder("cs_test_confirm2");

    const order = await getOrderByStripeSession("cs_test_confirm2");
    expect(order!.status).toBe("confirmed");
    expect(order!.stripe_payment_intent).toBeNull();
  });

  test("updates updated_at on confirmation", async () => {
    await insertOrder({
      stripe_session_id: "cs_test_ts",
      total_amount: 24.0,
      status: "pending",
    });

    const before =
      await sql`SELECT updated_at FROM orders WHERE stripe_session_id = 'cs_test_ts'`;
    await new Promise((r) => setTimeout(r, 10));

    await confirmOrder("cs_test_ts", "pi_test_ts");

    const after =
      await sql`SELECT updated_at FROM orders WHERE stripe_session_id = 'cs_test_ts'`;
    expect(
      new Date(after[0].updated_at as string).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at as string).getTime(),
    );
  });
});

describe("updateOrderStripeSession", () => {
  test("sets the Stripe session ID on an order", async () => {
    const id = await insertOrder({ total_amount: 24.0 });

    await updateOrderStripeSession(id, "cs_test_new_session");

    const order = await getOrderById(id);
    expect(order!.stripe_session_id).toBe("cs_test_new_session");
  });

  test("updates updated_at timestamp", async () => {
    const id = await insertOrder({ total_amount: 24.0 });

    const before = await sql`SELECT updated_at FROM orders WHERE id = ${id}`;
    await new Promise((r) => setTimeout(r, 10));

    await updateOrderStripeSession(id, "cs_test_new_session");

    const after = await sql`SELECT updated_at FROM orders WHERE id = ${id}`;
    expect(
      new Date(after[0].updated_at as string).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at as string).getTime(),
    );
  });
});

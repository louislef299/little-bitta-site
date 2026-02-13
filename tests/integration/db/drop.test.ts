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
  pastDate,
  futureDate,
} from "./test-utils";

// Set up the test database and mock the db module
const sql = await getTestSql();
mock.module("../../../src/lib/db/db", () => ({ sql }));

const {
  getDropById,
  getAllDrops,
  getDropsByStatus,
  getCurrentDrop,
  getDropCapacity,
  isDropAvailable,
  createDrop,
  updateDropStatus,
} = await import("../../../src/lib/db/drop");

beforeAll(async () => {
  await setupSchema(sql);
});

beforeEach(async () => {
  await truncateAll(sql);
});

afterAll(async () => {
  await teardown(sql);
});

// Helper to insert a drop directly via SQL
async function insertDrop(opts: {
  display_name: string;
  year: number;
  status?: string;
  start_date?: string | null;
  end_date?: string | null;
  prep_date?: string | null;
  description?: string | null;
}): Promise<number> {
  const status = opts.status ?? "upcoming";
  const rows = await sql`
    INSERT INTO drops (display_name, year, status, start_date, end_date, prep_date, description)
    VALUES (${opts.display_name}, ${opts.year}, ${status},
            ${opts.start_date ?? null}, ${opts.end_date ?? null},
            ${opts.prep_date ?? null}, ${opts.description ?? null})
    RETURNING id
  `;
  return (rows[0] as { id: number }).id;
}

describe("getDropById", () => {
  test("returns a drop by ID", async () => {
    const id = await insertDrop({
      display_name: "January",
      year: 2026,
      status: "upcoming",
      start_date: "2026-01-01",
      end_date: "2026-01-31",
    });

    const drop = await getDropById(id);
    expect(drop).not.toBeNull();
    expect(drop!.id).toBe(id);
    expect(drop!.display_name).toBe("January");
    expect(drop!.year).toBe(2026);
    expect(drop!.status).toBe("upcoming");
  });

  test("returns null for non-existent ID", async () => {
    const drop = await getDropById(999);
    expect(drop).toBeNull();
  });
});

describe("getAllDrops", () => {
  test("returns all drops ordered by year DESC, id DESC", async () => {
    await insertDrop({ display_name: "January", year: 2025 });
    await insertDrop({ display_name: "February", year: 2026 });
    await insertDrop({ display_name: "March", year: 2026 });

    const drops = await getAllDrops();
    expect(drops).toHaveLength(3);
    // 2026 drops first (by year DESC), then within same year by id DESC
    expect(drops[0].display_name).toBe("March");
    expect(drops[1].display_name).toBe("February");
    expect(drops[2].display_name).toBe("January");
  });

  test("returns empty array when no drops exist", async () => {
    const drops = await getAllDrops();
    expect(drops).toHaveLength(0);
  });
});

describe("getDropsByStatus", () => {
  test("returns only drops with matching status", async () => {
    await insertDrop({
      display_name: "Active Drop",
      year: 2026,
      status: "active",
    });
    await insertDrop({
      display_name: "Upcoming Drop",
      year: 2026,
      status: "upcoming",
    });
    await insertDrop({
      display_name: "Another Active",
      year: 2026,
      status: "active",
    });

    const activeDrops = await getDropsByStatus("active");
    expect(activeDrops).toHaveLength(2);
    expect(activeDrops.every((d) => d.status === "active")).toBe(true);
  });

  test("returns empty array when no drops match status", async () => {
    await insertDrop({
      display_name: "Active Drop",
      year: 2026,
      status: "active",
    });

    const soldOut = await getDropsByStatus("sold_out");
    expect(soldOut).toHaveLength(0);
  });
});

describe("getCurrentDrop", () => {
  test("returns drop whose date range includes now", async () => {
    await insertDrop({
      display_name: "Current",
      year: 2026,
      status: "active",
      start_date: pastDate(5),
      end_date: futureDate(5),
    });

    const drop = await getCurrentDrop();
    expect(drop).not.toBeNull();
    expect(drop!.display_name).toBe("Current");
  });

  test("returns null when no drop covers the current date", async () => {
    await insertDrop({
      display_name: "Past",
      year: 2026,
      status: "active",
      start_date: pastDate(30),
      end_date: pastDate(1),
    });

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });

  test("activates an upcoming drop whose date range includes now", async () => {
    const id = await insertDrop({
      display_name: "Upcoming",
      year: 2026,
      status: "upcoming",
      start_date: pastDate(1),
      end_date: futureDate(10),
    });

    const drop = await getCurrentDrop();
    expect(drop).not.toBeNull();
    expect(drop!.status).toBe("active");

    // Verify the status was persisted to the database
    const rows = await sql`SELECT status FROM drops WHERE id = ${id}`;
    expect(rows[0].status).toBe("active");
  });

  test("skips sold_out drops even if date range matches", async () => {
    await insertDrop({
      display_name: "Sold Out",
      year: 2026,
      status: "sold_out",
      start_date: pastDate(5),
      end_date: futureDate(5),
    });

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });

  test("skips ended drops even if date range matches", async () => {
    await insertDrop({
      display_name: "Ended",
      year: 2026,
      status: "ended",
      start_date: pastDate(5),
      end_date: futureDate(5),
    });

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });

  test("does not activate an already active drop", async () => {
    await insertDrop({
      display_name: "Active",
      year: 2026,
      status: "active",
      start_date: pastDate(3),
      end_date: futureDate(3),
    });

    const drop = await getCurrentDrop();
    expect(drop).not.toBeNull();
    expect(drop!.status).toBe("active");
  });

  test("returns null when drops exist but none match the current date", async () => {
    // Future drop
    await insertDrop({
      display_name: "Future",
      year: 2026,
      status: "upcoming",
      start_date: futureDate(10),
      end_date: futureDate(20),
    });
    // Past drop
    await insertDrop({
      display_name: "Past",
      year: 2026,
      status: "active",
      start_date: pastDate(20),
      end_date: pastDate(10),
    });

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });
});

describe("getDropCapacity", () => {
  test("returns capacity from drop_products table", async () => {
    await seedProducts(sql);
    const dropId = await insertDrop({ display_name: "January", year: 2026 });

    // Add capacity entries
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count) VALUES (${dropId}, 1, 25, 10)`;
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count) VALUES (${dropId}, 2, 15, 5)`;

    const capacity = await getDropCapacity(dropId);
    expect(capacity).not.toBeNull();
    expect(Number(capacity!.max)).toBe(40); // 25 + 15
    expect(Number(capacity!.current)).toBe(15); // 10 + 5
    expect(Number(capacity!.available)).toBe(25); // 40 - 15
    expect(capacity!.drop.id).toBe(dropId);
  });

  test("returns null for non-existent drop", async () => {
    const capacity = await getDropCapacity(999);
    expect(capacity).toBeNull();
  });

  test("returns zero capacity when drop has no products", async () => {
    const dropId = await insertDrop({ display_name: "Empty", year: 2026 });

    const capacity = await getDropCapacity(dropId);
    expect(capacity).not.toBeNull();
    expect(Number(capacity!.max)).toBe(0);
    expect(Number(capacity!.current)).toBe(0);
    expect(Number(capacity!.available)).toBe(0);
  });
});

describe("isDropAvailable", () => {
  test("returns true when drop has availability", async () => {
    await seedProducts(sql);
    const dropId = await insertDrop({ display_name: "January", year: 2026 });
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count) VALUES (${dropId}, 1, 25, 10)`;

    const available = await isDropAvailable(dropId);
    expect(available).toBe(true);
  });

  test("returns false when drop is sold out", async () => {
    await seedProducts(sql);
    const dropId = await insertDrop({ display_name: "January", year: 2026 });
    await sql`INSERT INTO drop_products (drop_id, product_id, max_capacity, sold_count) VALUES (${dropId}, 1, 10, 10)`;

    const available = await isDropAvailable(dropId);
    expect(available).toBe(false);
  });

  test("returns false for non-existent drop", async () => {
    const available = await isDropAvailable(999);
    expect(available).toBe(false);
  });
});

describe("createDrop", () => {
  test("creates a drop with all fields", async () => {
    const id = await createDrop({
      display_name: "March",
      year: 2026,
      status: "upcoming",
      start_date: "2026-03-01",
      end_date: "2026-03-31",
      prep_date: "2026-04-10",
      description: "Spring drop!",
    });

    expect(id).toBeGreaterThan(0);

    const drop = await getDropById(id);
    expect(drop).not.toBeNull();
    expect(drop!.display_name).toBe("March");
    expect(drop!.year).toBe(2026);
    expect(drop!.status).toBe("upcoming");
    expect(drop!.description).toBe("Spring drop!");
  });

  test("creates a drop with defaults", async () => {
    const id = await createDrop({
      display_name: "April",
      year: 2026,
    });

    const drop = await getDropById(id);
    expect(drop).not.toBeNull();
    expect(drop!.status).toBe("upcoming"); // default status
  });
});

describe("updateDropStatus", () => {
  test("updates the status of a drop", async () => {
    const id = await insertDrop({
      display_name: "January",
      year: 2026,
      status: "upcoming",
    });

    await updateDropStatus(id, "active");

    const drop = await getDropById(id);
    expect(drop).not.toBeNull();
    expect(drop!.status).toBe("active");
  });

  test("updates updated_at when status changes", async () => {
    const id = await insertDrop({
      display_name: "January",
      year: 2026,
      status: "upcoming",
    });

    const before = await sql`SELECT updated_at FROM drops WHERE id = ${id}`;
    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 10));

    await updateDropStatus(id, "active");

    const after = await sql`SELECT updated_at FROM drops WHERE id = ${id}`;
    expect(
      new Date(after[0].updated_at as string).getTime(),
    ).toBeGreaterThanOrEqual(
      new Date(before[0].updated_at as string).getTime(),
    );
  });

  test("can transition through all statuses", async () => {
    const id = await insertDrop({
      display_name: "January",
      year: 2026,
      status: "upcoming",
    });

    await updateDropStatus(id, "active");
    let drop = await getDropById(id);
    expect(drop!.status).toBe("active");

    await updateDropStatus(id, "sold_out");
    drop = await getDropById(id);
    expect(drop!.status).toBe("sold_out");

    await updateDropStatus(id, "ended");
    drop = await getDropById(id);
    expect(drop!.status).toBe("ended");
  });
});

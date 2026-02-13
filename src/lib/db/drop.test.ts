import { SQL } from "bun";
import { describe, test, expect, beforeEach, mock } from "bun:test";

// Mock the db module to use an in-memory SQLite database for tests
const sql = new SQL(":memory:");
mock.module("./db", () => ({ sql }));

const { getCurrentDrop } = await import("./drop");

async function setupDropsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS drops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL,
      year INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming'
        CHECK(status IN ('upcoming', 'active', 'sold_out', 'ended')),
      start_date TEXT,
      end_date TEXT,
      prep_date TEXT,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;
}

async function clearDrops() {
  await sql`DELETE FROM drops`;
}

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function pastDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

describe("getCurrentDrop", () => {
  beforeEach(async () => {
    await setupDropsTable();
    await clearDrops();
  });

  test("returns drop whose date range includes now", async () => {
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Current', 2026, 'active', ${pastDate(5)}, ${futureDate(5)})`;

    const drop = await getCurrentDrop();
    expect(drop).not.toBeNull();
    expect(drop!.display_name).toBe("Current");
  });

  test("returns null when no drop covers the current date", async () => {
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Past', 2026, 'active', ${pastDate(30)}, ${pastDate(1)})`;

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });

  test("activates an upcoming drop whose date range includes now", async () => {
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Upcoming', 2026, 'upcoming', ${pastDate(1)}, ${futureDate(10)})`;

    const drop = await getCurrentDrop();
    expect(drop).not.toBeNull();
    expect(drop!.status).toBe("active");

    // Verify the status was persisted to the database
    const rows = await sql`SELECT status FROM drops WHERE id = ${drop!.id}`;
    expect(rows[0].status).toBe("active");
  });

  test("skips sold_out drops even if date range matches", async () => {
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Sold Out', 2026, 'sold_out', ${pastDate(5)}, ${futureDate(5)})`;

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });

  test("skips ended drops even if date range matches", async () => {
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Ended', 2026, 'ended', ${pastDate(5)}, ${futureDate(5)})`;

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });

  test("does not activate an already active drop", async () => {
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Active', 2026, 'active', ${pastDate(3)}, ${futureDate(3)})`;

    const drop = await getCurrentDrop();
    expect(drop).not.toBeNull();
    expect(drop!.status).toBe("active");
  });

  test("returns null when drops exist but none match the current date", async () => {
    // Future drop
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Future', 2026, 'upcoming', ${futureDate(10)}, ${futureDate(20)})`;
    // Past drop
    await sql`INSERT INTO drops (display_name, year, status, start_date, end_date)
      VALUES ('Past', 2026, 'active', ${pastDate(20)}, ${pastDate(10)})`;

    const drop = await getCurrentDrop();
    expect(drop).toBeNull();
  });
});

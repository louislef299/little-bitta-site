import { sql } from "./db";

export type DropStatus = "upcoming" | "active" | "sold_out" | "ended";

export interface Drop {
  id: number;
  display_name: string;
  year: number;
  status: DropStatus;
  max_capacity: number;
  sold_count: number;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DropCapacity {
  drop: Drop; // The Drop this capacity belongs to
  current: number; // Items sold/confirmed
  max: number; // Maximum capacity
  available: number; // max - current
}

// Get a single drop by ID
export async function getDropById(id: number): Promise<Drop | null> {
  const rows = await sql`
    SELECT id, display_name, year, status, max_capacity,
           COALESCE(sold_count, 0) as sold_count,
           start_date, end_date, description, created_at, updated_at
    FROM drops WHERE id = ${id} LIMIT 1
  `;
  return (rows[0] as Drop) ?? null;
}

// Get all drops
export async function getAllDrops(): Promise<Drop[]> {
  return (await sql`
    SELECT id, display_name, year, status, max_capacity,
           COALESCE(sold_count, 0) as sold_count,
           start_date, end_date, description, created_at, updated_at
    FROM drops ORDER BY year DESC, id DESC
  `) as Drop[];
}

// Get drops by status
export async function getDropsByStatus(status: DropStatus): Promise<Drop[]> {
  return (await sql`
    SELECT id, display_name, year, status, max_capacity,
           COALESCE(sold_count, 0) as sold_count,
           start_date, end_date, description, created_at, updated_at
    FROM drops WHERE status = ${status} ORDER BY year DESC, id DESC
  `) as Drop[];
}

// Get the current active drop
export async function getCurrentDrop(): Promise<Drop | null> {
  const rows = await sql`
    SELECT id, display_name, year, status, max_capacity,
           COALESCE(sold_count, 0) as sold_count,
           start_date, end_date, description, created_at, updated_at
    FROM drops WHERE status = 'active' LIMIT 1
  `;
  return (rows[0] as Drop) ?? null;
}

// Get drop capacity (uses sold_count from drops table)
export async function getDropCapacity(dropId: number): Promise<DropCapacity | null> {
  const drop = await getDropById(dropId);
  if (!drop) return null;

  const current = drop.sold_count;
  const max = drop.max_capacity;

  return {
    drop,
    current,
    max,
    available: max - current,
  };
}

// Check if drop has availability
export async function isDropAvailable(dropId: number): Promise<boolean> {
  const capacity = await getDropCapacity(dropId);
  if (!capacity) return false;
  return capacity.available > 0;
}

// Update drop status
export async function updateDropStatus(
  id: number,
  status: DropStatus,
): Promise<void> {
  await sql`UPDATE drops SET status = ${status} WHERE id = ${id}`;
}

// Update drop capacity by incrementing/decrementing the sold count
// Positive n increases sold count, negative n decreases it
// Returns the updated DropCapacity
export async function updateDropCapacity(
  dropId: number,
  n: number,
): Promise<DropCapacity | null> {
  await sql`
    UPDATE drops
    SET sold_count = COALESCE(sold_count, 0) + ${n}
    WHERE id = ${dropId}
  `;
  return getDropCapacity(dropId);
}

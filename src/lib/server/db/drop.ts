import { sql } from "./db";

export type DropStatus = "upcoming" | "active" | "sold_out" | "ended";

export interface Drop {
  id: number;
  display_name: string;
  year: number;
  status: DropStatus;
  max_capacity: number;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DropCapacity {
  current: number; // Items sold/confirmed
  max: number; // Maximum capacity
  available: number; // max - current
}

// Get a single drop by ID
export async function getDropById(id: number): Promise<Drop | null> {
  const rows = await sql`
    SELECT id, display_name, year, status, max_capacity,
           start_date, end_date, description, created_at, updated_at
    FROM drops WHERE id = ${id} LIMIT 1
  `;
  return (rows[0] as Drop) ?? null;
}

// Get all drops
export async function getAllDrops(): Promise<Drop[]> {
  return (await sql`
    SELECT id, display_name, year, status, max_capacity,
           start_date, end_date, description, created_at, updated_at
    FROM drops ORDER BY year DESC, id DESC
  `) as Drop[];
}

// Get drops by status
export async function getDropsByStatus(status: DropStatus): Promise<Drop[]> {
  return (await sql`
    SELECT id, display_name, year, status, max_capacity,
           start_date, end_date, description, created_at, updated_at
    FROM drops WHERE status = ${status} ORDER BY year DESC, id DESC
  `) as Drop[];
}

// Get the current active drop
export async function getCurrentDrop(): Promise<Drop | null> {
  const rows = await sql`
    SELECT id, display_name, year, status, max_capacity,
           start_date, end_date, description, created_at, updated_at
    FROM drops WHERE status = 'active' LIMIT 1
  `;
  return (rows[0] as Drop) ?? null;
}

// Get drop capacity (calculates sold items from confirmed orders)
export async function getDropCapacity(dropId: number): Promise<DropCapacity | null> {
  const drop = await getDropById(dropId);
  if (!drop) return null;

  const soldRows = await sql`
    SELECT COALESCE(SUM(oi.quantity), 0) as sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.drop_id = ${dropId} AND o.status = 'confirmed'
  `;

  const current = Number(soldRows[0]?.sold ?? 0);
  const max = drop.max_capacity;

  return {
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

import { sql } from "./db";

export type DropStatus = "upcoming" | "active" | "sold_out" | "ended";

export interface Drop {
  id: number;
  display_name: string;
  year: number;
  status: DropStatus;
  start_date?: string | null;
  end_date?: string | null;
  prep_date?: string | null;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DropCapacity {
  drop: Drop; // The Drop this capacity belongs to
  current: number; // Items sold/confirmed (sum of drop_products.sold_count)
  max: number; // Maximum capacity (sum of drop_products.max_capacity)
  available: number; // max - current
}

// Get a single drop by ID
export async function getDropById(id: number): Promise<Drop | null> {
  const rows = await sql`
    SELECT id, display_name, year, status,
           start_date, end_date, description, created_at, updated_at
    FROM drops WHERE id = ${id} LIMIT 1
  `;
  return (rows[0] as Drop) ?? null;
}

// Get all drops
export async function getAllDrops(): Promise<Drop[]> {
  return (await sql`
    SELECT id, display_name, year, status,
      start_date, end_date, prep_date, description, created_at, updated_at
    FROM drops ORDER BY year DESC, id DESC
  `) as Drop[];
}

// Get drops by status
export async function getDropsByStatus(status: DropStatus): Promise<Drop[]> {
  return (await sql`
    SELECT id, display_name, year, status,
      start_date, end_date, prep_date, description, created_at, updated_at
    FROM drops WHERE status = ${status} ORDER BY year DESC, id DESC
  `) as Drop[];
}

// Get the current drop based on date range
export async function getCurrentDrop(): Promise<Drop | null> {
  const now = new Date().toISOString();
  const rows = await sql`
    SELECT id, display_name, year, status,
      start_date, end_date, prep_date, description, created_at, updated_at
    FROM drops
    WHERE start_date <= ${now}
      AND end_date > ${now}
      AND status != 'sold_out'
      AND status != 'ended'
    LIMIT 1
  `;
  const drop = (rows[0] as Drop) ?? null;
  if (drop && drop.status !== "active") {
    await updateDropStatus(drop.id, "active");
    drop.status = "active";
  }
  return drop;
}

// Get drop capacity (calculated from drop_products table)
export async function getDropCapacity(
  dropId: number,
): Promise<DropCapacity | null> {
  const drop = await getDropById(dropId);
  if (!drop) return null;

  // Calculate totals from drop_products
  const rows = await sql`
    SELECT 
      COALESCE(SUM(max_capacity), 0) as total_max,
      COALESCE(SUM(sold_count), 0) as total_sold
    FROM drop_products
    WHERE drop_id = ${dropId}
  `;

  const { total_max, total_sold } = rows[0] as {
    total_max: number;
    total_sold: number;
  };

  return {
    drop,
    current: total_sold,
    max: total_max,
    available: total_max - total_sold,
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

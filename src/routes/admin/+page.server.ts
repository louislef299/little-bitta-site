import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getAllProducts } from "$lib/server/db/product";
import { getAllDrops, getDropCapacity } from "$lib/server/db/drop";
import { sql } from "$lib/server/db/db";

export const load: PageServerLoad = async () => {
  // Only allow access in dev mode
  if (!dev) {
    throw error(404, "Not found");
  }

  const products = await getAllProducts();
  const drops = await getAllDrops();

  // Get calculated capacity for each drop
  const dropCapacities: Record<
    number,
    { max: number; sold: number; available: number }
  > = {};
  for (const drop of drops) {
    const capacity = await getDropCapacity(drop.id);
    if (capacity) {
      dropCapacities[drop.id] = {
        max: capacity.max,
        sold: capacity.current,
        available: capacity.available,
      };
    }
  }

  // Get all drop_products
  const dropProducts = await sql`
    SELECT dp.*, p.name as product_name, d.display_name as drop_name
    FROM drop_products dp
    JOIN products p ON dp.product_id = p.id
    JOIN drops d ON dp.drop_id = d.id
    ORDER BY dp.drop_id, dp.product_id
  `;

  // Get all orders with their items
  const orders = await sql`
    SELECT o.*, 
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    ORDER BY o.created_at DESC
  `;

  // Get order items with product names
  const orderItems = await sql`
    SELECT oi.*, p.name as product_name, d.display_name as drop_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN drops d ON oi.drop_id = d.id
    ORDER BY oi.order_id, oi.id
  `;

  return {
    products,
    drops,
    dropCapacities,
    dropProducts,
    orders,
    orderItems,
  };
};

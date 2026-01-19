#!/usr/bin/env bun

import { SQL } from "bun";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

export const sql = new SQL(DATABASE_URL);

const commands = {
  products: async () => {
    const rows = await sql`SELECT id, slug, name, price, product_type FROM products ORDER BY name`;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("No products found");
      return;
    }

    console.log("\nProducts:");
    console.log("─".repeat(70));
    for (const row of rows as any[]) {
      console.log(`  [${row.id}] ${row.name} (${row.slug}) - $${row.price} [${row.product_type}]`);
    }
    console.log("─".repeat(70));
    console.log(`Total: ${rows.length} products\n`);
  },

  drops: async () => {
    const rows = await sql`
      SELECT id, display_name, year, status, max_capacity, description
      FROM drops ORDER BY year DESC, id DESC
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("No drops found");
      return;
    }

    console.log("\nDrops:");
    console.log("─".repeat(70));
    for (const row of rows as any[]) {
      // Get capacity for this drop
      const capacityRows = await sql`
        SELECT COALESCE(SUM(oi.quantity), 0) as sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.drop_id = ${row.id} AND o.status = 'confirmed'
      `;
      const sold = Number(capacityRows[0]?.sold ?? 0);
      const available = row.max_capacity - sold;

      console.log(`  [${row.id}] ${row.display_name} ${row.year}`);
      console.log(`      Status: ${row.status}`);
      console.log(`      Capacity: ${sold}/${row.max_capacity} sold (${available} available)`);
      if (row.description) {
        console.log(`      Description: ${row.description}`);
      }
      console.log();
    }
    console.log("─".repeat(70));
    console.log(`Total: ${rows.length} drops\n`);
  },

  orders: async () => {
    const rows = await sql`
      SELECT id, stripe_session_id, stripe_payment_intent, customer_email,
             total_amount, status, created_at
      FROM orders ORDER BY created_at DESC
    `;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("No orders found");
      return;
    }

    console.log("\nOrders:");
    console.log("─".repeat(80));
    for (const row of rows as any[]) {
      console.log(`  [${row.id}] ${row.customer_email || 'No email'} - $${row.total_amount} (${row.status})`);
      console.log(`      Created: ${row.created_at}`);
      if (row.stripe_session_id) {
        console.log(`      Stripe Session: ${row.stripe_session_id}`);
      }
      if (row.stripe_payment_intent) {
        console.log(`      Payment Intent: ${row.stripe_payment_intent}`);
      }
      console.log();
    }
    console.log("─".repeat(80));
    console.log(`Total: ${rows.length} orders\n`);
  },

  "order-items": async () => {
    const orderId = process.argv[3];
    if (!orderId) {
      console.error("Usage: bun src/cli/index.ts order-items <order_id>");
      process.exit(1);
    }

    const order = await sql`
      SELECT id, customer_email, total_amount, status, created_at
      FROM orders WHERE id = ${orderId}
    `;

    if (!Array.isArray(order) || order.length === 0) {
      console.log(`Order ${orderId} not found`);
      return;
    }

    const orderData = order[0] as any;
    console.log(`\nOrder #${orderData.id} - ${orderData.customer_email || 'No email'}`);
    console.log(`Status: ${orderData.status} | Total: $${orderData.total_amount}`);
    console.log("─".repeat(70));

    const items = await sql`
      SELECT oi.id, oi.quantity, oi.unit_price, p.name as product_name, d.display_name as drop_name, d.year as drop_year
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN drops d ON oi.drop_id = d.id
      WHERE oi.order_id = ${orderId}
    `;

    if (!Array.isArray(items) || items.length === 0) {
      console.log("No items in this order");
      return;
    }

    for (const item of items as any[]) {
      const lineTotal = (item.quantity * item.unit_price).toFixed(2);
      console.log(`  ${item.product_name} x${item.quantity} @ $${item.unit_price} = $${lineTotal}`);
      console.log(`      Drop: ${item.drop_name} ${item.drop_year}`);
    }
    console.log("─".repeat(70));
    console.log();
  },

  capacity: async () => {
    const dropId = process.argv[3];

    let dropQuery;
    if (dropId) {
      dropQuery = await sql`SELECT id, display_name, year, max_capacity, status FROM drops WHERE id = ${dropId}`;
    } else {
      dropQuery = await sql`SELECT id, display_name, year, max_capacity, status FROM drops WHERE status = 'active' LIMIT 1`;
    }

    if (!Array.isArray(dropQuery) || dropQuery.length === 0) {
      console.log(dropId ? `Drop ${dropId} not found` : "No active drop found");
      return;
    }

    const drop = dropQuery[0] as any;

    // Get sold count
    const soldRows = await sql`
      SELECT COALESCE(SUM(oi.quantity), 0) as sold
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.drop_id = ${drop.id} AND o.status = 'confirmed'
    `;
    const sold = Number(soldRows[0]?.sold ?? 0);
    const available = drop.max_capacity - sold;
    const percentage = ((sold / drop.max_capacity) * 100).toFixed(1);

    console.log(`\nCapacity for ${drop.display_name} ${drop.year} (${drop.status}):`);
    console.log("─".repeat(50));
    console.log(`  Sold:      ${sold}`);
    console.log(`  Available: ${available}`);
    console.log(`  Max:       ${drop.max_capacity}`);
    console.log(`  Usage:     ${percentage}%`);
    console.log("─".repeat(50));

    // Show breakdown by order
    const orderBreakdown = await sql`
      SELECT o.id, o.customer_email, o.status, SUM(oi.quantity) as qty
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE oi.drop_id = ${drop.id}
      GROUP BY o.id, o.customer_email, o.status
      ORDER BY o.created_at DESC
    `;

    if (Array.isArray(orderBreakdown) && orderBreakdown.length > 0) {
      console.log("\nOrders contributing to this drop:");
      for (const row of orderBreakdown as any[]) {
        const status = row.status === 'confirmed' ? '✓' : row.status === 'pending' ? '⏳' : '✗';
        console.log(`  ${status} Order #${row.id}: ${row.qty} items (${row.customer_email || 'no email'}) [${row.status}]`);
      }
    }
    console.log();
  },

  help: () => {
    console.log(`
Little Bitta CLI - Admin Tool

Usage: bun src/cli/index.ts <command> [args]

Commands:
  products          List all products
  drops             List all drops with capacity info
  orders            List all orders
  order-items <id>  Show items for a specific order
  capacity [id]     Show capacity for active drop (or specific drop by ID)
  help              Show this help message
`);
  },
};

async function main() {
  const command = process.argv[2] || "help";

  if (command in commands) {
    await commands[command as keyof typeof commands]();
  } else {
    console.error(`Unknown command: ${command}`);
    commands.help();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

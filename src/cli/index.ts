#!/usr/bin/env bun

import { SQL } from "bun";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

export const sql = new SQL(DATABASE_URL);

const commands = {
  list: async () => {
    const rows = await sql`SELECT id, slug, name, price FROM granola ORDER BY name`;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.log("No granola found");
      return;
    }

    console.log("\nGranola Products:");
    console.log("─".repeat(60));
    for (const row of rows as any[]) {
      console.log(`  [${row.id}] ${row.name} (${row.slug}) - $${row.price}`);
    }
    console.log("─".repeat(60));
    console.log(`Total: ${rows.length} products\n`);
  },

  help: () => {
    console.log(`
Little Bitta CLI - Admin Tool

Usage: bun src/cli/index.ts <command>

Commands:
  list    List all granola products
  help    Show this help message
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

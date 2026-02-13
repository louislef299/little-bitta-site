import { dev } from "$app/environment";
import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { getAllDrops, createDrop, updateDropStatus } from "$lib/db/drop";
import type { DropStatus } from "$lib/db/drop";
import { getAllProducts } from "$lib/db/product";
import { setProductCapacity } from "$lib/db/drop-product";
import { sql } from "$lib/db/db";

export const load: PageServerLoad = async () => {
  if (!dev) {
    throw error(404, "Not found");
  }

  const drops = await getAllDrops();
  const products = await getAllProducts();

  // Get all drop_products with joined names
  const dropProducts = await sql`
    SELECT dp.*, p.name as product_name, d.display_name as drop_name
    FROM drop_products dp
    JOIN products p ON dp.product_id = p.id
    JOIN drops d ON dp.drop_id = d.id
    ORDER BY dp.drop_id DESC, p.name
  `;

  return { drops, products, dropProducts };
};

export const actions: Actions = {
  createDrop: async ({ request }) => {
    if (!dev) throw error(404, "Not found");

    const data = await request.formData();
    const display_name = data.get("display_name")?.toString().trim();
    const year = Number(data.get("year"));
    const start_date = data.get("start_date")?.toString() || undefined;
    const end_date = data.get("end_date")?.toString() || undefined;
    const prep_date = data.get("prep_date")?.toString() || undefined;
    const description = data.get("description")?.toString().trim() || undefined;

    if (!display_name) {
      return fail(400, { error: "Display name is required" });
    }
    if (!year || year < 2024 || year > 2100) {
      return fail(400, { error: "Valid year is required" });
    }

    await createDrop({
      display_name,
      year,
      start_date,
      end_date,
      prep_date,
      description,
    });

    return { success: true, message: `Drop "${display_name}" created` };
  },

  setCapacity: async ({ request }) => {
    if (!dev) throw error(404, "Not found");

    const data = await request.formData();
    const drop_id = Number(data.get("drop_id"));
    const product_id = Number(data.get("product_id"));
    const max_capacity = Number(data.get("max_capacity"));

    if (!drop_id || !product_id) {
      return fail(400, { error: "Drop and product are required" });
    }
    if (max_capacity < 0) {
      return fail(400, { error: "Capacity must be 0 or greater" });
    }

    await setProductCapacity(drop_id, product_id, max_capacity);

    return { success: true };
  },

  updateStatus: async ({ request }) => {
    if (!dev) throw error(404, "Not found");

    const data = await request.formData();
    const drop_id = Number(data.get("drop_id"));
    const status = data.get("status")?.toString() as DropStatus;

    const validStatuses: DropStatus[] = [
      "upcoming",
      "active",
      "in_the_oven",
      "sold_out",
      "ended",
    ];

    if (!drop_id) {
      return fail(400, { error: "Drop ID is required" });
    }
    if (!validStatuses.includes(status)) {
      return fail(400, { error: "Invalid status" });
    }

    await updateDropStatus(drop_id, status);

    return { success: true };
  },
};

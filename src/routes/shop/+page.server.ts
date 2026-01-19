import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getAllProducts } from "$lib/server/db/product";
import { getCurrentDrop, getDropCapacity } from "$lib/server/db/drop";

export const load: PageServerLoad = async () => {
  const product = await getAllProducts();

  if (!product || product.length === 0) {
    throw error(404, {
      message: "Could not find any Granola",
    });
  }

  const drop = await getCurrentDrop();
  if (!drop) {
    throw error(500, {
      message: "No active drop configured",
    });
  }

  const capacity = await getDropCapacity(drop.id);

  return { product, drop, capacity };
};

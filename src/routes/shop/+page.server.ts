import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getAllProducts } from "$lib/server/db/product";
import { getCurrentDrop } from "$lib/server/db/drop";
import { getDropProductCapacities } from "$lib/server/db/drop-product";

export const load: PageServerLoad = async () => {
  const products = await getAllProducts();

  if (!products || products.length === 0) {
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

  // Get per-product capacities for the current drop
  const productCapacitiesMap = await getDropProductCapacities(drop.id);

  // Convert Map to a plain object for serialization
  const productCapacities: Record<
    number,
    { product_id: number; max: number; sold: number; available: number }
  > = {};
  for (const [productId, capacity] of productCapacitiesMap) {
    productCapacities[productId] = capacity;
  }

  return { products, drop, productCapacities };
};

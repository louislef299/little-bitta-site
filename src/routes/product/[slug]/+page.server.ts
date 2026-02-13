import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getProductBySlug } from "$lib/db/product";
import { getCurrentDrop } from "$lib/db/drop";
import { getProductCapacity } from "$lib/db/drop-product";

export const load: PageServerLoad = async ({ params }) => {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    throw error(404, {
      message: `Granola ${params.slug} not found`,
    });
  }

  const drop = await getCurrentDrop();
  if (!drop) {
    throw error(500, {
      message: "No active drop configured",
    });
  }

  // Get product-level capacity for this product in the current drop
  const pcap = await getProductCapacity(drop.id, product.id);

  return { product, drop, pcap };
};

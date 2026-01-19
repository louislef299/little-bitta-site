import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getAllProducts } from "$lib/server/db/product";

export const load: PageServerLoad = async () => {
  const product = await getAllProducts();

  if (!product || product.length === 0) {
    throw error(404, {
      message: "Could not find any Granola",
    });
  }

  return { product };
};

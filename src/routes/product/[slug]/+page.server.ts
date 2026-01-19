import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getProductBySlug } from "$lib/server/db/product";

export const load: PageServerLoad = async ({ params }) => {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    throw error(404, {
      message: `Granola ${params.slug} not found`,
    });
  }

  return { product };
};

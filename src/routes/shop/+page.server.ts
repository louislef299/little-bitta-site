import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getAllGranola } from "$lib/server/db/granola";

export const load: PageServerLoad = async () => {
  const granola = await getAllGranola();

  if (!granola || granola.length === 0) {
    throw error(404, {
      message: "Could not find any Granola",
    });
  }

  return { granola };
};

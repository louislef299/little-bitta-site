import { dev } from "$app/environment";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getCurrentDrop } from "$lib/server/db/drop";

export const load: PageServerLoad = async () => {
  // Only allow access in dev mode
  if (!dev) {
    throw error(404, "Not found");
  }

  const drop = await getCurrentDrop();
  if (drop === null) {
    throw error(500, "Drop returned null");
  }

  return { drop };
};

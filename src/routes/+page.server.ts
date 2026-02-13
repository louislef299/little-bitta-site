import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getCurrentDrop, getDropCapacity } from "$lib/db/drop";

export const load: PageServerLoad = async () => {
  const drop = await getCurrentDrop();
  if (!drop) {
    throw error(500, {
      message: "No active drop configured",
    });
  }

  const capacity = await getDropCapacity(drop.id);
  if (!capacity) {
    throw error(500, {
      message: "No capacity found for active drop",
    });
  }

  return { drop, capacity };
};

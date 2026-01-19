import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getAllGranola } from "$lib/server/db/granola";
import { checkConnection } from "$lib/server/db/db";

export const load: PageServerLoad = async () => {
  // Verify database connection
  const connected = await checkConnection();
  if (!connected) {
    throw error(500, {
      message: "Failed to gather Granola",
    });
  }

  console.log("Database connected");
  const granola = await getAllGranola();

  if (!granola) {
    throw error(404, {
      message: "Could not find any Granola",
    });
  }

  return { granola };
};

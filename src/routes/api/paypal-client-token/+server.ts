import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getPayPalClientToken } from "$lib/paypal.svelte";

export const GET: RequestHandler = async () => {
  // Retry logic: attempt up to 3 times
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const clientToken = await getPayPalClientToken();
      return json({ accessToken: clientToken });
    } catch (err) {
      lastError = err as Error;
      console.error(
        `PayPal client token generation failed (attempt ${attempt}/${maxRetries}):`,
        err,
      );

      // If this wasn't the last attempt, wait a bit before retrying
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay between retries
      }
    }
  }

  // All retries failed
  // TODO: Improve error handling - consider user-facing error messages or fallback mechanisms
  throw error(
    500,
    `Failed to generate PayPal client token after ${maxRetries} attempts: ${lastError?.message}`,
  );
};

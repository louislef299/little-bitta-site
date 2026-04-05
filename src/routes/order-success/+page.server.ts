import { getStripe } from "$lib/payments/stripe";
import { verifyCheckoutSession } from "$lib/payments/verify-payment";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const sessionId = url.searchParams.get("session_id");

  if (!sessionId) {
    return { success: false, error: "No session ID provided" };
  }

  try {
    const stripe = getStripe();

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });

    // Use the verification utility to check payment status
    const result = verifyCheckoutSession(session);

    return result;
  } catch (err) {
    console.error("[OrderSuccess] Failed to verify payment:", err);
    return {
      success: false,
      error: "Failed to verify payment",
    };
  }
};

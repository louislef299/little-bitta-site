import { getStripe } from "$lib/payments/stripe";
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

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      return { success: false, error: "Payment not completed" };
    }

    return {
      orderTotal: session.amount_total,
      items: session.line_items?.data,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
    };
  } catch (err) {
    console.error("[OrderSuccess] Failed to verify payment:", err);
    return {
      success: false,
      error: "Failed to verify payment",
    };
  }
};

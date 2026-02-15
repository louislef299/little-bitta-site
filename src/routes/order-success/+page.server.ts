import { getStripe } from "$lib/payments/stripe";
import { verifyCheckoutSession } from "$lib/payments/verify-payment";
import { paypalRequest } from "$lib/payments/paypal";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const sessionId = url.searchParams.get("session_id");
  const paypalOrderId = url.searchParams.get("paypal_order_id");

  if (sessionId) {
    return await verifyStripePayment(sessionId);
  }

  if (paypalOrderId) {
    return await verifyPayPalPayment(paypalOrderId);
  }

  return { success: false, error: "No order ID provided" };
};

async function verifyStripePayment(sessionId: string) {
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "payment_intent"],
    });
    return verifyCheckoutSession(session);
  } catch (err) {
    console.error("[OrderSuccess] Failed to verify Stripe payment:", err);
    return { success: false, error: "Failed to verify payment" };
  }
}

async function verifyPayPalPayment(orderId: string) {
  try {
    const order = await paypalRequest(`/v2/checkout/orders/${orderId}`);

    if (order.status === "COMPLETED") {
      const payer = order.payer ?? order.payment_source?.paypal;
      return {
        success: true,
        customerEmail: payer?.email_address ?? null,
        paymentStatus: order.status,
      };
    }

    return {
      success: false,
      error: `Payment not completed (status: ${order.status})`,
      paymentStatus: order.status,
    };
  } catch (err) {
    console.error("[OrderSuccess] Failed to verify PayPal payment:", err);
    return { success: false, error: "Failed to verify payment" };
  }
}

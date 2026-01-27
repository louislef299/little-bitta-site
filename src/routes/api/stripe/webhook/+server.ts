// https://docs.stripe.com/webhooks

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStripe } from "$lib/server/stripe";
import { env } from "$env/dynamic/private";
import {
  getCurrentDrop,
  updateDropCapacity,
  updateDropStatus,
} from "$lib/server/db/drop";

export const POST: RequestHandler = async ({ request }) => {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    throw error(400, "Missing stripe-signature header");
  }

  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error("[StripeWebhook] STRIPE_WEBHOOK_SECRET not configured");
    throw error(500, "Webhook not configured");
  }

  let event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[StripeWebhook] Signature verification failed: ${message}`);
    throw error(400, `Webhook signature verification failed: ${message}`);
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log(`[StripeWebhook] Checkout session completed: ${session.id}`);

      // Only process if payment was successful
      if (session.payment_status === "paid") {
        await handleSuccessfulPayment(session);
      }
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      // For payment methods that confirm asynchronously (e.g., bank transfers)
      const session = event.data.object;
      console.log(`[StripeWebhook] Async payment succeeded: ${session.id}`);
      await handleSuccessfulPayment(session);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
      console.log(`[StripeWebhook] Checkout session expired: ${session.id}`);
      // Could release reserved capacity here if using reservation system
      break;
    }

    default:
      console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
  }

  return json({ received: true });
};

async function handleSuccessfulPayment(
  session: import("stripe").Stripe.Checkout.Session
) {
  try {
    const stripe = getStripe();

    // Retrieve line items to get total quantity
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    const totalQuantity = lineItems.data.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );

    if (totalQuantity === 0) {
      console.warn(`[StripeWebhook] No items in session ${session.id}`);
      return;
    }

    // Update the drop sold_count
    const currDrop = await getCurrentDrop();
    if (!currDrop) {
      console.error("[StripeWebhook] No active drop found");
      return;
    }

    const capacity = await updateDropCapacity(currDrop.id, totalQuantity);
    console.log(
      `[StripeWebhook] Updated drop ${currDrop.id} sold_count by ${totalQuantity}`
    );

    // Check if drop is now sold out
    if (capacity && capacity.available <= 0) {
      await updateDropStatus(currDrop.id, "sold_out");
      console.log(`[StripeWebhook] Drop ${currDrop.id} marked as sold_out`);
    }
  } catch (err) {
    console.error("[StripeWebhook] Failed to handle successful payment:", err);
    // Don't throw - we've already received the event, and throwing would cause
    // Stripe to retry
  }
}

// https://docs.stripe.com/webhooks

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStripe } from "$lib/server/stripe";
import { env } from "$env/dynamic/private";
import {
  getCurrentDrop,
  getDropCapacity,
  updateDropStatus,
} from "$lib/server/db/drop";
import { updateProductCapacity } from "$lib/server/db/drop-product";

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
      env.STRIPE_WEBHOOK_SECRET,
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
  session: import("stripe").Stripe.Checkout.Session,
) {
  try {
    const stripe = getStripe();

    // Retrieve line items with expanded price.product to get metadata
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
    });

    const totalQuantity = lineItems.data.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0,
    );

    if (totalQuantity === 0) {
      console.warn(`[StripeWebhook] No items in session ${session.id}`);
      return;
    }

    // Get the current drop
    const currDrop = await getCurrentDrop();
    if (!currDrop) {
      console.error("[StripeWebhook] No active drop found");
      return;
    }

    // Update per-product sold counts (this is the source of truth)
    for (const lineItem of lineItems.data) {
      const quantity = lineItem.quantity || 0;
      if (quantity === 0) continue;

      // Get product metadata (order_item_id is our product ID)
      const product = lineItem.price?.product;
      if (
        typeof product === "object" &&
        product !== null &&
        "metadata" in product
      ) {
        const productId = product.metadata?.order_item_id;
        if (productId) {
          await updateProductCapacity(
            currDrop.id,
            parseInt(productId),
            quantity,
          );
          console.log(
            `[StripeWebhook] Updated product ${productId} sold_count by ${quantity}`,
          );
        } else {
          console.warn(
            `[StripeWebhook] No order_item_id in product metadata for line item`,
          );
        }
      } else {
        console.warn(
          `[StripeWebhook] Could not get product metadata for line item`,
        );
      }
    }

    // Check if drop is now sold out (calculated from drop_products)
    const capacity = await getDropCapacity(currDrop.id);
    console.log(
      `[StripeWebhook] Drop ${currDrop.id} capacity: ${capacity?.current}/${capacity?.max} (${capacity?.available} available)`,
    );

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

import { dev } from "$app/environment";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStripe } from "$lib/server/stripe";
import { getCurrentDrop, getDropCapacity } from "$lib/server/db/drop";
import { getProductCapacity } from "$lib/server/db/drop-product";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { items } = await request.json();

    // Calculate total quantity requested
    const totalQuantity = items.reduce(
      (sum: number, item: any) => sum + (item.quantity || 1),
      0,
    );

    // Check drop availability before creating checkout session
    const currDrop = await getCurrentDrop();
    if (!currDrop) {
      console.error("[StripeHandler] No active drop found");
      throw error(400, "No active drop available");
    }

    const dropCapacity = await getDropCapacity(currDrop.id);
    if (!dropCapacity) {
      console.error("[StripeHandler] Could not get drop capacity");
      throw error(500, "Could not verify drop availability");
    }

    if (dropCapacity.available < totalQuantity) {
      throw error(400, `Only ${dropCapacity.available} items available`);
    }

    // Check per-product availability
    for (const item of items) {
      const productCapacity = await getProductCapacity(currDrop.id, item.id);
      if (productCapacity.available < item.quantity) {
        throw error(
          400,
          `Only ${productCapacity.available} of ${item.name} available`,
        );
      }
    }

    // Build line_items from cart items
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          metadata: {
            order_item_id: item.id.toString(),
          },
        },
        unit_amount: item.price * 100, // Convert to cents
      },
      quantity: item.quantity,
      // allows for actions.updateLineItemQuantity() on client
      adjustable_quantity: {
        enabled: true,
        minimum: 0,
        maximum: 50,
      },
    }));
    console.log("Creating checkout session for items:", items);

    const origin = dev ? "http://localhost:5173" : url.origin;
    const stripe = getStripe();

    // Create Stripe Checkout Session
    // https://docs.stripe.com/api/checkout/sessions/create
    console.log(`Using return origin ${origin}`);
    const session = await stripe.checkout.sessions.create({
      ui_mode: "custom",
      line_items,
      mode: "payment",
      automatic_tax: {
        enabled: true,
      },
      return_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Note: sold_count is updated AFTER payment confirmation (in order-success
    // or webhook) not here, since the user hasn't paid yet.

    // Gather line_items for metadata
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(
      session.id,
      {
        expand: ["line_items"],
      },
    );

    // Build mapping by array index (items are in same order)
    const lineItemMapping: Record<number, string> = {};
    items.forEach((item: any, index: number) => {
      const stripeLineItem = sessionWithLineItems.line_items?.data[index];
      if (stripeLineItem) {
        lineItemMapping[item.id] = stripeLineItem.id;
      }
    });

    return json({
      clientSecret: session.client_secret,
      dropCapacity,
      lineItemMapping,
    });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(500, `Failed to create checkout session: ${message}`);
  }
};

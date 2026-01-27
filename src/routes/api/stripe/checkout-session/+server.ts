import { dev } from "$app/environment";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStripe } from "$lib/server/stripe";
import { getCurrentDrop, getDropCapacity } from "$lib/server/db/drop";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { items } = await request.json();

    // Calculate total quantity requested
    const totalQuantity = items.reduce(
      (sum: number, item: any) => sum + (item.quantity || 1),
      0
    );

    // Check drop availability before creating checkout session
    const currDrop = await getCurrentDrop();
    if (!currDrop) {
      console.error("[StripeHandler] No active drop found");
      throw error(400, "No active drop available");
    }

    const capacity = await getDropCapacity(currDrop.id);
    if (!capacity) {
      console.error("[StripeHandler] Could not get drop capacity");
      throw error(500, "Could not verify drop availability");
    }

    if (capacity.available < totalQuantity) {
      throw error(400, `Only ${capacity.available} items available`);
    }

    // Build line_items from cart items
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
          metadata: {
            order_item_id: item.id.toString()
          }
        },
        unit_amount: item.price * 100, // Convert to cents
      },
      quantity: item.quantity,
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
      return_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    });

    // Note: sold_count is updated AFTER payment confirmation (in order-success
    // or webhook) not here, since the user hasn't paid yet.

    // Gather line_items for metadata
    const sessionWithLineItems = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['line_items']
    });

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
      dropCapacity: capacity,
      lineItemMapping,
    });
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(500, `Failed to create checkout session: ${message}`);
  }
};

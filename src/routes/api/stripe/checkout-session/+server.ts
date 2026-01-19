import { dev } from "$app/environment";
import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getStripe } from "$lib/server/stripe";

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { items } = await request.json();

    // Build line_items from cart items
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: "usd",
        product_data: {
          name: item.name,
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
    console.log(`using return origin ${origin}`);
    const session = await stripe.checkout.sessions.create({
      ui_mode: "custom",
      line_items,
      mode: "payment",
      return_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error("Payment intent creation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(500, `Failed to create payment intent: ${message}`);
  }
};

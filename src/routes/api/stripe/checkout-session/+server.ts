import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import Stripe from 'stripe';

const stripe = new Stripe(SECRET_STRIPE_KEY, {
  apiVersion: '2025-12-15.clover',
});

export const POST: RequestHandler = async ({ request, url }) => {
  try {
    const { items } = await request.json();

    // Build line_items from cart items
    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
        },
        unit_amount: item.price * 100, // Convert to cents
      },
      quantity: item.quantity,
    }));
    console.log('Creating checkout session for items:', items);

    // Create Stripe Checkout Session
    // https://docs.stripe.com/api/checkout/sessions/create
    const origin = dev ? 'http://localhost:5173' : url.origin;
    console.log(`using return origin ${origin}`)
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      line_items,
      mode: "payment",
      return_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
    });

    return json({clientSecret: session.client_secret});
  } catch (err) {
    console.error('Payment intent creation failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw error(500, `Failed to create payment intent: ${message}`);
  }
};

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SECRET_STRIPE_KEY } from '$env/static/private';
import Stripe from 'stripe';

const stripe = new Stripe(SECRET_STRIPE_KEY, {
  apiVersion: '2025-12-15.clover',
});

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { items } = await request.json();

    // Calculate total from items (in cents)
    const amount = items.reduce((sum: number, item: any) => {
      return sum + (item.price * item.quantity * 100);
    }, 0);

    console.log('Creating checkout session for items:', items, 'Amount (cents):', amount);

    // Create Stripe Checkout Session
    // https://docs.stripe.com/api/checkout/sessions/create
    const session = await stripe.checkout.sessions.create({
      ui_mode: 'custom',
      line_items: [
        {
          "price_data" : {
              "currency" : "usd",
              "product_data":{
                  "name": "Generic Granola"
              },
              "unit_amount": 1200,
          },
          "quantity": 1
        }
      ],
      mode: "payment",
      return_url: "http://localhost:5173/order-success?session_id={CHECKOUT_SESSION_ID}",
    });

    return json({clientSecret: session.client_secret});
  } catch (err) {
    console.error('Payment intent creation failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw error(500, `Failed to create payment intent: ${message}`);
  }
};

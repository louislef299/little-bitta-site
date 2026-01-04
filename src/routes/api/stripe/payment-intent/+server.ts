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

    console.log('Creating payment intent for items:', items, 'Amount (cents):', amount);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Ensure integer
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        items: JSON.stringify(items.map((item: any) => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })))
      }
    });

    console.log('Created payment intent:', paymentIntent.id);

    return json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('Payment intent creation failed:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    throw error(500, `Failed to create payment intent: ${message}`);
  }
};

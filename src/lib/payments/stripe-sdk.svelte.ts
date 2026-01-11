import { PUBLIC_STRIPE_KEY } from '$env/static/public';
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

let stripeInstance = $state<Stripe | null>(null);

export function getStripeInstance() {
  return stripeInstance;
}

export function isStripeSDKLoaded(): boolean {
  return stripeInstance != null;
}

export async function loadStripeSDK() {
  if (stripeInstance) {
    console.debug("[Stripe] SDK already loaded")
    return stripeInstance;
  }

  try {
    const stripe = await loadStripe(PUBLIC_STRIPE_KEY);
    if (!stripe) {
      throw new Error('[Stripe] Failed to load SDK');
    }
    stripeInstance = stripe;
    console.debug("[Stripe] Loaded SDK!")
    return stripe;
  } catch (error) {
    console.error('[Stripe] Failed to load SDK:', error);
    throw error;
  }
}

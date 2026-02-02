import Stripe from "stripe";
import { env } from "$env/dynamic/private";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!env.SECRET_STRIPE_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }

    // https://www.npmjs.com/package/stripe#configuration
    _stripe = new Stripe(env.SECRET_STRIPE_KEY, {
      maxNetworkRetries: 2,
      protocol: 'https',
    });
  }
  return _stripe;
}

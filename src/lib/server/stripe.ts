import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (!_stripe) {
        if (!env.SECRET_STRIPE_KEY) {
            throw new Error('STRIPE_SECRET_KEY is required');
        }
        _stripe = new Stripe(env.SECRET_STRIPE_KEY, {
            apiVersion: '2025-12-15.clover',
        });
    }
    return _stripe;
}

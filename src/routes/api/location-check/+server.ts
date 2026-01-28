import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from "./$types";
import { ALLOWED_ZIP_CODES, DELIVERY_ERROR_MESSAGE } from '$lib/config/delivery-zones';

export const POST: RequestHandler = async ({ request }) => {
    // https://docs.stripe.com/js/custom_checkout/session_object#custom_checkout_session_object-billingAddress-address
    const address = await request.json();
    const zipCode = address.postal_code?.substring(0, 5); // Handle 9-digit zips
  
    if (ALLOWED_ZIP_CODES.has(zipCode)) {
        return json({ valid: true });
    } else {
        return json({ valid: false, message: DELIVERY_ERROR_MESSAGE }, { status: 400 });
    }
};
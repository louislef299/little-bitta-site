import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = async ({ request }) => {
    // https://docs.stripe.com/js/custom_checkout/session_object#custom_checkout_session_object-billingAddress-address
    const address = await request.json();
    if (address.city == "Edina") {
        return json(200);
    } else {
        throw error(400, "Not a valid city");
    }
};
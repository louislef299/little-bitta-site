import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PAYPAL_ENV } from '$env/static/private';
import { getPayPalAccessToken } from '$lib/paypal.svelte';

export const POST: RequestHandler = async ({ request }) => {
	const { orderID } = await request.json();

	// Get PayPal access token
	const accessToken = await getPayPalAccessToken();

	// Capture the PayPal order
	const url = PAYPAL_ENV === 'production'
		? `https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`
		: `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`;

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${accessToken}`
		}
	});

	const captureData = await response.json();

	console.log('Captured PayPal order:', orderID, captureData.status);

	return json(captureData);
};

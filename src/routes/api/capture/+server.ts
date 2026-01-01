import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV } from '$env/static/private';

// Get PayPal access token
async function getPayPalAccessToken() {
	const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
	const url = PAYPAL_ENV === 'production'
		? 'https://api-m.paypal.com/v1/oauth2/token'
		: 'https://api-m.sandbox.paypal.com/v1/oauth2/token';

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${auth}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});

	const data = await response.json();
	return data.access_token;
}

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

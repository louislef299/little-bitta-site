import { json, error } from '@sveltejs/kit';
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

	if (!response.ok) {
		console.error('PayPal auth error:', data);
		throw new Error('Failed to authenticate with PayPal');
	}

	return data.access_token;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { items } = await request.json();

		// Calculate total from items (not from cart.svelte which doesn't work server-side)
		const total = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

		console.log('Creating order for items:', items, 'Total:', total);

		const accessToken = await getPayPalAccessToken();

	// Create PayPal order
	const url = PAYPAL_ENV === 'production'
		? 'https://api-m.paypal.com/v2/checkout/orders'
		: 'https://api-m.sandbox.paypal.com/v2/checkout/orders';

		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${accessToken}`
			},
			body: JSON.stringify({
				intent: 'CAPTURE',
				purchase_units: [{
					amount: {
						currency_code: 'USD',
						value: total.toFixed(2),
						breakdown: {
							item_total: {
								currency_code: 'USD',
								value: total.toFixed(2)
							}
						}
					},
					items: items.map((item: any) => ({
						name: item.name,
						quantity: item.quantity.toString(),
						unit_amount: {
							currency_code: 'USD',
							value: item.price.toFixed(2)
						}
					}))
				}]
			})
		});

		const order = await response.json();

		if (!response.ok) {
			console.error('PayPal order creation error:', order);
			throw error(500, `PayPal API error: ${JSON.stringify(order)}`);
		}

		console.log('Created PayPal order:', order.id);

		return json({ id: order.id });
	} catch (err) {
		console.error('Order creation failed:', err);
		throw error(500, `Failed to create order: ${err}`);
	}
};

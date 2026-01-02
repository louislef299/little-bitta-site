import { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV } from '$env/static/private';

// Get PayPal access token
// https://docs.paypal.ai/payments/methods/pay-links-buttons-api#how-it-works
export async function getPayPalAccessToken() {
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

import {
  PAYPAL_CLIENT_ID,
  PAYPAL_CLIENT_SECRET,
  PAYPAL_ENV,
} from "$env/static/private";

// Get PayPal access token
// https://docs.paypal.ai/payments/methods/pay-links-buttons-api#how-it-works
export async function getPayPalAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");
  const url =
    PAYPAL_ENV === "production"
      ? "https://api-m.paypal.com/v1/oauth2/token"
      : "https://api-m.sandbox.paypal.com/v1/oauth2/token";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("PayPal auth error:", data);
    throw new Error("Failed to authenticate with PayPal");
  }

  return data.access_token;
}

// Get PayPal client token for SDK v6 initialization
// Client tokens are browser-safe JWT tokens that expire after 15 minutes
// https://developer.paypal.com/api/rest/authentication/
export async function getPayPalClientToken() {
  const auth = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");
  const url =
    PAYPAL_ENV === "production"
      ? "https://api-m.paypal.com/v1/oauth2/token"
      : "https://api-m.sandbox.paypal.com/v1/oauth2/token";

  // Determine domain based on environment
  const domain =
    PAYPAL_ENV === "production" ? "littlebitta.com" : "localhost:5173";

  // TODO: Implement token caching/refresh logic
  // Currently generating fresh token on every request (15min expiry)
  // Consider caching tokens and refreshing when expired to reduce API calls

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      response_type: "client_token",
      "domains[]": domain,
    }).toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("PayPal client token error:", data);
    throw new Error("Failed to generate PayPal client token");
  }

  return data.access_token;
}

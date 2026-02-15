import { env } from "$env/dynamic/private";
import { PUBLIC_PAYPAL_CLIENT_ID } from "$env/static/public";

async function getAccessToken(): Promise<string> {
  if (!env.SECRET_PAYPAL_CLIENT_ID) {
    throw new Error("SECRET_PAYPAL_CLIENT_ID is required");
  }

  const credentials = btoa(
    `${PUBLIC_PAYPAL_CLIENT_ID}:${env.SECRET_PAYPAL_CLIENT_ID}`,
  );

  const response = await fetch(`${env.PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal auth failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function paypalRequest(
  path: string,
  method: string = "GET",
  body?: unknown,
): Promise<any> {
  const accessToken = await getAccessToken();

  const response = await fetch(`${env.PAYPAL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal API error (${response.status}): ${text}`);
  }

  return response.json();
}

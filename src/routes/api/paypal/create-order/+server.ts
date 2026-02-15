import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { paypalRequest } from "$lib/payments/paypal";
import { getCurrentDrop, getDropCapacity } from "$lib/db/drop";
import { getProductCapacity } from "$lib/db/drop-product";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { items } = await request.json();

    // Calculate total quantity requested
    const totalQuantity = items.reduce(
      (sum: number, item: any) => sum + (item.quantity || 1),
      0,
    );

    // Check drop availability before creating order
    const currDrop = await getCurrentDrop();
    if (!currDrop) {
      console.error("[PayPalHandler] No active drop found");
      throw error(400, "No active drop available");
    }

    const dropCapacity = await getDropCapacity(currDrop.id);
    if (!dropCapacity) {
      console.error("[PayPalHandler] Could not get drop capacity");
      throw error(500, "Could not verify drop availability");
    }

    if (dropCapacity.available < totalQuantity) {
      throw error(400, `Only ${dropCapacity.available} items available`);
    }

    // Check per-product availability
    for (const item of items) {
      const productCapacity = await getProductCapacity(currDrop.id, item.id);
      if (productCapacity.available < item.quantity) {
        throw error(
          400,
          `Only ${productCapacity.available} of ${item.name} available`,
        );
      }
    }

    // Build PayPal order items
    const purchaseItems = items.map((item: any) => ({
      name: item.name,
      quantity: String(item.quantity),
      unit_amount: {
        currency_code: "USD",
        value: Number(item.price).toFixed(2),
      },
      custom_id: String(item.id),
    }));

    const itemTotal = items.reduce(
      (sum: number, item: any) => sum + Number(item.price) * item.quantity,
      0,
    );

    // Create PayPal order via Orders API v2
    const order = await paypalRequest("/v2/checkout/orders", "POST", {
      intent: "CAPTURE",
      purchase_units: [
        {
          items: purchaseItems,
          amount: {
            currency_code: "USD",
            value: itemTotal.toFixed(2),
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: itemTotal.toFixed(2),
              },
            },
          },
          custom_id: String(currDrop.id),
        },
      ],
    });

    console.log(`[PayPalHandler] Created order: ${order.id}`);
    return json({ id: order.id });
  } catch (err) {
    console.error("[PayPalHandler] Order creation failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(500, `Failed to create PayPal order: ${message}`);
  }
};

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { paypalRequest } from "$lib/payments/paypal";
import {
  getCurrentDrop,
  getDropCapacity,
  updateDropStatus,
} from "$lib/db/drop";
import { updateProductCapacity } from "$lib/db/drop-product";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { orderID } = await request.json();

    if (!orderID) {
      throw error(400, "Missing orderID");
    }

    // Capture the payment
    const captureData = await paypalRequest(
      `/v2/checkout/orders/${orderID}/capture`,
      "POST",
    );

    if (captureData.status !== "COMPLETED") {
      console.error(
        `[PayPalCapture] Order ${orderID} status: ${captureData.status}`,
      );
      return json({ status: captureData.status });
    }

    console.log(`[PayPalCapture] Payment captured for order: ${orderID}`);

    // Update inventory — mirror the Stripe webhook logic
    await handleSuccessfulPayment(captureData);

    return json({
      status: captureData.status,
      email:
        captureData.payer?.email_address ??
        captureData.payment_source?.paypal?.email_address,
    });
  } catch (err) {
    console.error("[PayPalCapture] Capture failed:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    throw error(500, `Failed to capture PayPal order: ${message}`);
  }
};

async function handleSuccessfulPayment(captureData: any) {
  try {
    const purchaseUnit = captureData.purchase_units?.[0];
    if (!purchaseUnit) {
      console.warn("[PayPalCapture] No purchase units in capture data");
      return;
    }

    // Get drop ID from custom_id on the purchase unit
    const dropId = purchaseUnit.custom_id
      ? parseInt(purchaseUnit.custom_id)
      : null;

    // Fallback to current drop if custom_id not set
    let currentDropId: number;
    if (dropId) {
      currentDropId = dropId;
    } else {
      const currDrop = await getCurrentDrop();
      if (!currDrop) {
        console.error("[PayPalCapture] No active drop found");
        return;
      }
      currentDropId = currDrop.id;
    }

    // Extract items from the capture data
    const items = purchaseUnit.items;
    if (!items || items.length === 0) {
      console.warn("[PayPalCapture] No items in purchase unit");
      return;
    }

    // Update per-product sold counts
    for (const item of items) {
      const productId = item.custom_id ? parseInt(item.custom_id) : null;
      const quantity = parseInt(item.quantity) || 0;

      if (!productId || quantity === 0) {
        console.warn("[PayPalCapture] Skipping item without custom_id or zero quantity");
        continue;
      }

      await updateProductCapacity(currentDropId, productId, quantity);
      console.log(
        `[PayPalCapture] Updated product ${productId} sold_count by ${quantity}`,
      );
    }

    // Check if drop is now sold out
    const capacity = await getDropCapacity(currentDropId);
    console.log(
      `[PayPalCapture] Drop ${currentDropId} capacity: ${capacity?.current}/${capacity?.max} (${capacity?.available} available)`,
    );

    if (capacity && capacity.available <= 0) {
      await updateDropStatus(currentDropId, "sold_out");
      console.log(`[PayPalCapture] Drop ${currentDropId} marked as sold_out`);
    }
  } catch (err) {
    console.error("[PayPalCapture] Failed to handle successful payment:", err);
  }
}

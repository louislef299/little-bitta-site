import type Stripe from "stripe";

export interface PaymentVerificationResult {
  success: boolean;
  orderTotal?: number | null;
  items?: Stripe.LineItem[];
  paymentStatus?: string;
  customerEmail?: string | null;
  error?: string;
}

/**
 * Verifies a Stripe checkout session to determine if payment was successful.
 *
 * A payment is considered successful if:
 * - payment_status is "paid" or "no_payment_required"
 * - status is not "expired"
 *
 * @param session - The Stripe checkout session to verify
 * @returns PaymentVerificationResult with success boolean and relevant details
 */
export function verifyCheckoutSession(
  session: Stripe.Checkout.Session,
): PaymentVerificationResult {
  // Check if session is expired
  if (session.status === "expired") {
    return {
      success: false,
      error: "Checkout session has expired",
    };
  }

  // Check payment status
  const isPaid =
    session.payment_status === "paid" ||
    session.payment_status === "no_payment_required";

  if (!isPaid) {
    const status = session.payment_status || "unknown";
    return {
      success: false,
      error: `Payment not completed (status: ${status})`,
      paymentStatus: session.payment_status,
    };
  }

  // Payment successful - return order details
  return {
    success: true,
    orderTotal: session.amount_total,
    items: session.line_items?.data,
    paymentStatus: session.payment_status,
    customerEmail: session.customer_details?.email,
  };
}

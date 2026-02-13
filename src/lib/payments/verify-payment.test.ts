import { describe, test, expect } from "bun:test";
import { verifyCheckoutSession } from "./verify-payment";
import type Stripe from "stripe";

// Helper to create a mock Stripe checkout session
function createMockSession(
  overrides: Partial<Stripe.Checkout.Session> = {},
): Stripe.Checkout.Session {
  return {
    id: "cs_test_123",
    object: "checkout.session",
    status: "complete",
    payment_status: "paid",
    amount_total: 2000,
    customer_details: {
      email: "test@example.com",
      phone: null,
      tax_exempt: "none",
      tax_ids: null,
      address: null,
      name: null,
    },
    line_items: {
      object: "list",
      data: [
        {
          id: "li_test_123",
          object: "item",
          amount_total: 2000,
          amount_subtotal: 2000,
          currency: "usd",
          description: "Test Product",
          quantity: 1,
        } as Stripe.LineItem,
      ],
      has_more: false,
      url: "/v1/checkout/sessions/cs_test_123/line_items",
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("verifyCheckoutSession", () => {
  test("returns success for paid session", () => {
    const session = createMockSession({ payment_status: "paid" });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(true);
    expect(result.orderTotal).toBe(2000);
    expect(result.customerEmail).toBe("test@example.com");
    expect(result.paymentStatus).toBe("paid");
    expect(result.items).toHaveLength(1);
    expect(result.error).toBeUndefined();
  });

  test("returns success for no_payment_required session", () => {
    const session = createMockSession({
      payment_status: "no_payment_required",
      amount_total: 0,
    });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(true);
    expect(result.orderTotal).toBe(0);
    expect(result.paymentStatus).toBe("no_payment_required");
    expect(result.error).toBeUndefined();
  });

  test("returns failure for unpaid session", () => {
    const session = createMockSession({ payment_status: "unpaid" });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Payment not completed");
    expect(result.error).toContain("unpaid");
    expect(result.paymentStatus).toBe("unpaid");
    expect(result.orderTotal).toBeUndefined();
    expect(result.items).toBeUndefined();
  });

  test("returns failure for expired session", () => {
    const session = createMockSession({
      status: "expired",
      payment_status: "unpaid",
    });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Checkout session has expired");
    expect(result.orderTotal).toBeUndefined();
  });

  test("returns failure for session with null payment_status", () => {
    const session = createMockSession({ payment_status: null as any });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Payment not completed");
    expect(result.error).toContain("unknown");
  });

  test("handles session with missing line_items", () => {
    const session = createMockSession({ line_items: undefined });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(true);
    expect(result.items).toBeUndefined();
  });

  test("handles session with missing customer_details", () => {
    const session = createMockSession({ customer_details: null as any });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(true);
    expect(result.customerEmail).toBeUndefined();
  });

  test("handles session with null amount_total", () => {
    const session = createMockSession({ amount_total: null });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(true);
    expect(result.orderTotal).toBeNull();
  });

  test("returns failure for processing payment status", () => {
    const session = createMockSession({
      payment_status: "processing" as any,
    });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Payment not completed");
    expect(result.error).toContain("processing");
    expect(result.paymentStatus).toBe("processing");
  });

  test("expired session takes precedence over payment status", () => {
    // Even if payment_status is "paid", an expired session should fail
    const session = createMockSession({
      status: "expired",
      payment_status: "paid",
    });
    const result = verifyCheckoutSession(session);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Checkout session has expired");
  });
});

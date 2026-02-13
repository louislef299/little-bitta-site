import { sql } from "./db";

export type OrderStatus = "pending" | "confirmed" | "cancelled" | "refunded";

export interface Order {
  id: number;
  stripe_session_id?: string | null;
  stripe_payment_intent?: string | null;
  customer_email?: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  drop_id: number;
  quantity: number;
  unit_price: number;
  created_at?: string;
}

export interface CreateOrderInput {
  stripe_session_id?: string;
  customer_email?: string;
  total_amount: number;
  items: {
    product_id: number;
    drop_id: number;
    quantity: number;
    unit_price: number;
  }[];
}

// Create a new order with items
export async function createOrder(input: CreateOrderInput): Promise<number> {
  // Insert order
  const orderResult = await sql`
    INSERT INTO orders (stripe_session_id, customer_email, total_amount, status)
    VALUES (${input.stripe_session_id ?? null}, ${input.customer_email ?? null},
            ${input.total_amount}, 'pending')
  `;

  // Get the inserted order ID
  const orderId = Number(orderResult.lastInsertRowid);

  // Insert order items
  for (const item of input.items) {
    await sql`
      INSERT INTO order_items (order_id, product_id, drop_id, quantity, unit_price)
      VALUES (${orderId}, ${item.product_id}, ${item.drop_id}, ${item.quantity}, ${item.unit_price})
    `;
  }

  return orderId;
}

// Get order by ID
export async function getOrderById(id: number): Promise<Order | null> {
  const rows = await sql`
    SELECT id, stripe_session_id, stripe_payment_intent, customer_email,
           total_amount, status, created_at, updated_at
    FROM orders WHERE id = ${id} LIMIT 1
  `;
  return (rows[0] as Order) ?? null;
}

// Get order by Stripe session ID
export async function getOrderByStripeSession(
  sessionId: string,
): Promise<Order | null> {
  const rows = await sql`
    SELECT id, stripe_session_id, stripe_payment_intent, customer_email,
           total_amount, status, created_at, updated_at
    FROM orders WHERE stripe_session_id = ${sessionId} LIMIT 1
  `;
  return (rows[0] as Order) ?? null;
}

// Get order items for an order
export async function getOrderItems(orderId: number): Promise<OrderItem[]> {
  return (await sql`
    SELECT id, order_id, product_id, drop_id, quantity, unit_price, created_at
    FROM order_items WHERE order_id = ${orderId}
  `) as OrderItem[];
}

// Update order status
export async function updateOrderStatus(
  id: number,
  status: OrderStatus,
): Promise<void> {
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

// Confirm order by Stripe session ID (update status and optionally add payment intent)
export async function confirmOrder(
  sessionId: string,
  paymentIntent?: string,
): Promise<void> {
  if (paymentIntent) {
    await sql`
      UPDATE orders SET status = 'confirmed', stripe_payment_intent = ${paymentIntent}
      WHERE stripe_session_id = ${sessionId}
    `;
  } else {
    await sql`
      UPDATE orders SET status = 'confirmed'
      WHERE stripe_session_id = ${sessionId}
    `;
  }
}

// Update order with Stripe session ID (called after checkout session is created)
export async function updateOrderStripeSession(
  orderId: number,
  sessionId: string,
): Promise<void> {
  await sql`
    UPDATE orders SET stripe_session_id = ${sessionId}
    WHERE id = ${orderId}
  `;
}

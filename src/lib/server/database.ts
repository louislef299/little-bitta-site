// In a real app, this data would live in a database,
// rather than in memory. But for now, we cheat.
const db = new Map();

// Represents the order coming from the browser from the customer
type Order = {
    id: string
    items: [OrderItem]
    customer: Customer
    orderDate: Date
    fulfillmentDate: Date | null
}

// This is the actual granola relative to the Order
type OrderItem = {
    id: string
    granola: string
    quantity: number
}

// This is the actual granola representation
type GranolaItem = {
    id: string
    name: string
}

// Customer information
type Customer = {
    id: string
    name: string
    address: string
}

export function getOrder(orderID:string) {
	return db.get(orderID);
}

export function createOrder(c: Customer, g: [OrderItem]): string {
    const orderID = crypto.randomUUID()
    const order: Order = {
        id: orderID,
        items: g,
        customer: c,
        orderDate: new Date(),
        fulfillmentDate: null,
    }

	db.set(orderID, order);
    return orderID
}

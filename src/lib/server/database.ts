// In a real app, this data would live in a database,
// rather than in memory. But for now, we cheat.
const db = new Map();
const now: Date = new Date();
const tempIter: Iteration = {
    id: crypto.randomUUID(),
    start: new Date(),
    // one week later
    end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
}

// Represents the order coming from the browser from the customer
type Order = {
    id: string
    iteration: string
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

type Iteration = {
    id: string
    start: Date
    end: Date
}

export function getOrder(orderID:string) {
	return db.get(orderID);
}

export function createOrder(c: Customer, g: [OrderItem]): string {
    const orderID = crypto.randomUUID()
    const order: Order = {
        id: orderID,
        iteration: tempIter.id,
        items: g,
        customer: c,
        orderDate: new Date(),
        fulfillmentDate: null,
    }

	db.set(orderID, order);
    return orderID
}

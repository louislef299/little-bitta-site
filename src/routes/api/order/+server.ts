import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import * as database from '$lib/database.js';

export const POST: RequestHandler = async ({ request }) => {
	const { orders } = await request.json();

    const id = await database.createOrder(orders);
    console.log(`Created order with ID ${id}`)

	return json(orders);
};

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getGranolaBySlug } from '$lib/server/db/granola';

export const load: PageServerLoad = async ({ params }) => {
	const granola = await getGranolaBySlug(params.slug);

	if (!granola) {
		throw error(404, {
			message: `Granola ${params.slug} not found`
		});
	}

	return { granola };
};
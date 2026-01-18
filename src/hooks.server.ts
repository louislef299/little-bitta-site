import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';

export const handle: Handle = async ({ event, resolve }) => {
    if (!dev) return resolve(event);

    const start = performance.now();
    const response = await resolve(event);
    console.log(`${event.url.pathname}: ${(performance.now() - start).toFixed(0)}ms`);
    return response;
};

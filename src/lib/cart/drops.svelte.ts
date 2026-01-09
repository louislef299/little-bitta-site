export type Drop = {
    id: string,
    long: string,
}

/***
 * For next time:
 * 
 * Update the drop-based system to just invalidate the +Cart button when a drop
 * limit has been reached. Then, make a +Waitlist button appear to add items to
 * a waitlist. With the waitlist functionality, will need to make user profiles
 * possible so that users can check-in on their order status.
 * 
 * Do we want that? Is that too much complexity for now? Maybe instead, I'll
 * just grey out the +Cart button and have an interactive graph that makes it
 * clear that we are at capacity for the current drop date and tell users when
 * they can return again for more granola.
 * 
***/

export function getDrops(): Drop[] {
    return [
        {
            id: "jan",
            long: "January",
        },
        {
            id: "fed",
            long: "February",
        },
        {
            id: "mar",
            long: "March",
        },
        {
            id: "apr",
            long: "April",
        }
    ]
}

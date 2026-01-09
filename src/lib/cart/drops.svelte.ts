export type Drop = {
  id: string;
  long: string;
};

export type DropCapacity = {
  current: number;
  max: number;
};

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
    },
  ];
}

// Mock capacity data - replace with API call to your backend
export function getDropCapacity(dropId: string): DropCapacity {
  // This would eventually fetch from your database/API
  const capacityData: Record<string, DropCapacity> = {
    jan: { current: 45, max: 50 },
    fed: { current: 12, max: 50 },
    mar: { current: 50, max: 50 },
    apr: { current: 0, max: 50 },
  };

  return capacityData[dropId] || { current: 0, max: 50 };
}

export function isDropAvailable(dropId: string): boolean {
  const capacity = getDropCapacity(dropId);
  return capacity.current < capacity.max;
}

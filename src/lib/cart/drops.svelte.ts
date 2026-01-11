import { cart } from "$lib/cart/cart.svelte";

// Drop status types for limited release e-commerce
export type DropStatus = 'upcoming' | 'active' | 'sold_out' | 'ended';

export type Drop = {
  id: string;
  long: string;
  year: number;
  status: DropStatus;
  start_date?: Date;  // Optional: for time-bounded drops
  end_date?: Date;    // Optional: drop end date
  description?: string; // Marketing copy for the drop
  created_at?: Date;
};

export type DropCapacity = {
  current: number;      // Items sold/confirmed
  max: number;          // Maximum capacity
  allocated: number;    // Items reserved in carts (not yet purchased)
  available: number;    // Calculated: max - (current + allocated)
};

export function getCurrentDrop(): Drop {
  return {
      id: "jan",
      long: "January",
      year: 2026,
      status: "active"
    }
}

// Mock capacity data - replace with API call to your backend
export function getDropCapacity(dropId: string): DropCapacity {
  // This would eventually fetch from your database/API
  // Simulating DB data (confirmed sales)
  const dbCapacityData: Record<string, { current: number; max: number }> = {
    jan: { current: 15, max: 50 },
    fed: { current: 12, max: 50 },
    mar: { current: 50, max: 50 },
    apr: { current: 0, max: 50 },
  };

  // Calculate items currently allocated (reserved) in cart
  const cartItemTotal = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const baseCapacity = dbCapacityData[dropId] || { current: 0, max: 50 };
  const allocated = cartItemTotal; // Items in cart (not yet purchased)
  const available = baseCapacity.max - (baseCapacity.current + allocated);

  return {
    current: baseCapacity.current,
    max: baseCapacity.max,
    allocated,
    available
  };
}

export function isDropAvailable(dropId: string): boolean {
  const capacity = getDropCapacity(dropId);
  return capacity.available > 0;
}

export type Drop = {
  id: string;
  long: string;
  year: number;
};

export type DropCapacity = {
  current: number;
  max: number;
};

export function getCurrentDrop(): Drop {
  return {
      id: "jan",
      long: "January",
      year: 2026
    }
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

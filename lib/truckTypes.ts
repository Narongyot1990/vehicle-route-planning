export const TRUCK_TYPE_OPTIONS = [
  "6W",
  "6W+Trailer",
  "10W",
  "10W Trailer",
  "Prime Mover",
  "Car carrier",
  "4W",
  "Van",
] as const;

export type TruckTypeOption = (typeof TRUCK_TYPE_OPTIONS)[number];

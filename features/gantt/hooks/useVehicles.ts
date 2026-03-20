import { useMemo } from "react";
import { MOCK_VEHICLES, type Vehicle } from "@/features/gantt/data/mockVehicles";

export function useVehicles(): Vehicle[] {
  // TODO: replace with API call when backend is ready
  // return useQuery({ queryKey: ["vehicles"], queryFn: fetchVehicles });
  return useMemo(() => MOCK_VEHICLES, []);
}

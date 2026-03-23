import { useState, useEffect } from "react";
import type { Vehicle } from "@/lib/types";

export function useVehicles(): { vehicles: Vehicle[]; loading: boolean; error: string | null } {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch vehicles");
        return res.json();
      })
      .then((data) => {
        setVehicles(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { vehicles, loading, error };
}

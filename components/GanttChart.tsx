import { GanttChartFeature } from "@/features/gantt/components/GanttChartFeature";

type GanttChartProps = {
  vehicles: string[];
};

export function GanttChart({ vehicles }: GanttChartProps) {
  return <GanttChartFeature vehicles={vehicles} />;
}

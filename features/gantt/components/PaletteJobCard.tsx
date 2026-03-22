"use client";

import { usePaletteJobCard, type PaletteJobCardProps } from "@/features/gantt/hooks/usePaletteJobCard";
import {
  PaletteJobCardPlacementEdit,
  PaletteJobCardEdit,
  PaletteJobCardPlannedStartEdit,
  PaletteJobCardNormal
} from "@/features/gantt/components/PaletteJobCardViews";

export function PaletteJobCard(props: PaletteJobCardProps) {
  const state = usePaletteJobCard(props);

  if (props.isEditingPlacement) {
    return <PaletteJobCardPlacementEdit state={state} />;
  }

  if (props.isEditing) {
    return <PaletteJobCardEdit state={state} />;
  }

  if (props.isEditingPlannedStart) {
    return <PaletteJobCardPlannedStartEdit state={state} />;
  }

  // Normal View
  return <PaletteJobCardNormal state={state} />;
}

import type { DragEvent } from "react";
import { getDurationHours, type JobItem } from "@/lib/gantt";

type ToolboxTemplateCardProps = {
  template: JobItem;
  isDragging: boolean;
  onToolTemplateDragStart: (templateId: string, event: DragEvent<HTMLElement>) => void;
  onToolTemplateDragEnd: () => void;
};

export function ToolboxTemplateCard({
  template,
  isDragging,
  onToolTemplateDragStart,
  onToolTemplateDragEnd
}: ToolboxTemplateCardProps) {
  const totalDuration = getDurationHours(template);
  const primarySegment = template.segments[0];

  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    onToolTemplateDragStart(template.id, event);
  };

  return (
    <div
      className={`toolbox-card${isDragging ? " is-dragging" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onToolTemplateDragEnd}
    >
      <div
        className="toolbox-card-shape"
        style={{ background: primarySegment?.color ?? "#1f6f5f" }}
      />
      <div className="toolbox-card-copy">
        <h4>{template.title}</h4>
        <p>{primarySegment?.label ?? template.note}</p>
      </div>
      <div className="toolbox-card-badge">{totalDuration}h</div>
    </div>
  );
}

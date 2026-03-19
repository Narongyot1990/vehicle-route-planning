import type { DragEvent } from "react";
import type { JobItem } from "@/lib/gantt";
import { ToolboxTemplateCard } from "@/features/gantt/components/ToolboxTemplateCard";

type ToolboxPopupProps = {
  templates: JobItem[];
  activeToolTemplateId: string | null;
  onToolTemplateDragStart: (templateId: string, event: DragEvent<HTMLElement>) => void;
  onToolTemplateDragEnd: () => void;
};

export function ToolboxPopup({
  templates,
  activeToolTemplateId,
  onToolTemplateDragStart,
  onToolTemplateDragEnd
}: ToolboxPopupProps) {
  return (
    <div className="toolbox-popup">
      <p className="toolbox-popup-label">Toolbox</p>

      <div className="toolbox-list">
        {templates.map((template) => (
          <ToolboxTemplateCard
            key={template.id}
            template={template}
            isDragging={activeToolTemplateId === template.id}
            onToolTemplateDragStart={onToolTemplateDragStart}
            onToolTemplateDragEnd={onToolTemplateDragEnd}
          />
        ))}
      </div>
    </div>
  );
}

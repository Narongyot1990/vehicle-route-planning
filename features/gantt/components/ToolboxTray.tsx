import { useEffect, useRef, useState, type DragEvent } from "react";
import type { JobItem } from "@/lib/gantt";
import { TOOLBOX_TEMPLATES } from "@/features/gantt/constants";
import { ToolboxPopup } from "@/features/gantt/components/ToolboxPopup";

type ToolboxTrayProps = {
  activeToolTemplateId: string | null;
  onToolTemplateDragStart: (templateId: string, event: DragEvent<HTMLElement>) => void;
  onToolTemplateDragEnd: () => void;
};

function ToolIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="edit-icon-svg">
      <path
        d="M14.5 4a3.5 3.5 0 0 0-3.22 4.86L4.3 15.84a2 2 0 0 0 0 2.83l1.03 1.03a2 2 0 0 0 2.83 0l6.98-6.98A3.5 3.5 0 1 0 14.5 4Z"
        fill="currentColor"
      />
      <path d="m13 7 4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ToolboxTray({
  activeToolTemplateId,
  onToolTemplateDragStart,
  onToolTemplateDragEnd
}: ToolboxTrayProps) {
  const trayRef = useRef<HTMLDivElement>(null);
  const [toolboxOpen, setToolboxOpen] = useState(false);

  const handleToggle = () => {
    setToolboxOpen((current) => !current);
  };

  const handleDocumentMouseDown = (event: MouseEvent) => {
    const target = event.target as Node;
    if (trayRef.current?.contains(target)) {
      return;
    }

    setToolboxOpen(false);
  };

  useEffect(() => {
    if (!toolboxOpen) {
      return;
    }

    document.addEventListener("mousedown", handleDocumentMouseDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentMouseDown);
    };
  }, [toolboxOpen]);

  const handleToolTemplateDragStartInternal = (templateId: string, event: DragEvent<HTMLElement>) => {
    onToolTemplateDragStart(templateId, event);
  };

  const handleToolTemplateDragEndInternal = () => {
    setToolboxOpen(false);
    onToolTemplateDragEnd();
  };

  return (
    <div className="toolbox-tray" ref={trayRef}>
      {toolboxOpen ? (
        <ToolboxPopup
          templates={TOOLBOX_TEMPLATES as JobItem[]}
          activeToolTemplateId={activeToolTemplateId}
          onToolTemplateDragStart={handleToolTemplateDragStartInternal}
          onToolTemplateDragEnd={handleToolTemplateDragEndInternal}
        />
      ) : null}

      <button type="button" className="toolbox-fab" onClick={handleToggle}>
        <ToolIcon />
        <span>Tools</span>
      </button>
    </div>
  );
}

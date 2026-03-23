"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { JobHistoryEntry } from "@/features/gantt/hooks/useJobHistory";

type HistorySplitButtonProps = {
  direction: "undo" | "redo";
  disabled: boolean;
  busy?: boolean;
  nextLabel: string | null;
  entries: JobHistoryEntry[];
  onSingle: () => void;
  onMany: (count: number) => void;
};

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="history-icon-svg">
      <path
        d="M9 7 4 12l5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 17a7 7 0 0 0-7-7H4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="history-icon-svg">
      <path
        d="m15 7 5 5-5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17a7 7 0 0 1 7-7h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" className="history-caret-svg">
      <path d="M2 4.5 6 8l4-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HistorySplitButton({
  direction,
  disabled,
  busy = false,
  nextLabel,
  entries,
  onSingle,
  onMany,
}: HistorySplitButtonProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const verb = direction === "undo" ? "Undo" : "Redo";
  const shortcut = direction === "undo" ? "Ctrl/Cmd+Z" : "Ctrl+Y / Ctrl+Shift+Z";
  const actionCount = hoveredIndex == null ? 0 : hoveredIndex + 1;

  const footerLabel = useMemo(() => {
    if (busy) {
      return `${verb} in progress...`;
    }
    if (actionCount === 0) {
      return `Select actions to ${verb.toLowerCase()}`;
    }
    return `${verb} ${actionCount} action${actionCount === 1 ? "" : "s"}`;
  }, [actionCount, busy, verb]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target as Node)) {
        setMenuOpen(false);
        setHoveredIndex(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setHoveredIndex(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleMainClick = () => {
    if (disabled) {
      return;
    }
    setMenuOpen(false);
    setHoveredIndex(null);
    onSingle();
  };

  const handleToggleClick = () => {
    if (disabled || entries.length === 0) {
      return;
    }
    setMenuOpen((current) => !current);
    setHoveredIndex(null);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
    setHoveredIndex(null);
  };

  const handleMenuItemEnter = (index: number) => {
    setHoveredIndex(index);
  };

  const handleMenuLeave = () => {
    setHoveredIndex(null);
  };

  const handleMenuItemClick = (index: number) => {
    onMany(index + 1);
    handleMenuClose();
  };

  return (
    <div className={`history-split${menuOpen ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="history-button history-main-button icon-only"
        onClick={handleMainClick}
        disabled={disabled}
        aria-label={nextLabel ? `${verb} ${nextLabel}` : verb}
        title={nextLabel ? `${verb} ${nextLabel} (${shortcut})` : `${verb} (${shortcut})`}
      >
        {direction === "undo" ? <UndoIcon /> : <RedoIcon />}
      </button>
      <button
        type="button"
        className="history-button history-menu-toggle"
        onClick={handleToggleClick}
        disabled={disabled || entries.length === 0}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title={`Show ${verb.toLowerCase()} history`}
      >
        <CaretIcon />
      </button>

      {menuOpen ? (
        <div className="history-menu" role="menu" onMouseLeave={handleMenuLeave}>
          <div className="history-menu-heading">{verb} history</div>
          <div className="history-menu-list">
            {entries.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                role="menuitem"
                className={`history-menu-item${hoveredIndex != null && index <= hoveredIndex ? " active" : ""}`}
                onMouseEnter={() => handleMenuItemEnter(index)}
                onFocus={() => handleMenuItemEnter(index)}
                onClick={() => handleMenuItemClick(index)}
              >
                <span className="history-menu-item-index">{index + 1}.</span>
                <span className="history-menu-item-label">{entry.label}</span>
              </button>
            ))}
          </div>
          <div className="history-menu-footer">{footerLabel}</div>
        </div>
      ) : null}
    </div>
  );
}

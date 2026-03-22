/**
 * ModalShell — shared modal backdrop + container.
 * Eliminates duplicate overlay/container styles across JobModal and JobOrderEditModal.
 */
import type { ReactNode, MouseEvent } from "react";

type ModalShellProps = {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: number;
};

export function ModalShell({ children, onClose, maxWidth = 680 }: ModalShellProps) {
  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: "var(--bg-surface, #fff)",
          borderRadius: "12px",
          width: "100%",
          maxWidth: `${maxWidth}px`,
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

import { useEffect, useId, useRef } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "neutral";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const confirmedRef = useRef(false);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;

    if (open) {
      confirmedRef.current = false;
      if (typeof node.showModal === "function") {
        if (!node.open) node.showModal();
      } else {
        node.setAttribute("open", "");
      }
      // Focus the safe action after the dialog is shown.
      queueMicrotask(() => cancelRef.current?.focus());
      return;
    }

    if (typeof node.close === "function" && node.open) {
      node.close();
    } else {
      node.removeAttribute("open");
    }
  }, [open]);

  function handleClose() {
    if (confirmedRef.current) {
      confirmedRef.current = false;
      return;
    }
    onCancel();
  }

  function handleConfirm() {
    confirmedRef.current = true;
    onConfirm();
  }

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClose={handleClose}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onCancel();
      }}
    >
      <div className="confirm-dialog__panel reset-confirmation reset-confirmation--modal">
        <div>
          <h2 id={titleId}>{title}</h2>
          <p id={descriptionId}>{description}</p>
        </div>
        <div className="reset-confirmation__actions">
          <button
            ref={cancelRef}
            className="button button--secondary"
            type="button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={
              tone === "danger"
                ? "button button--danger-solid"
                : "button button--primary"
            }
            type="button"
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

import { useRef } from "react";
import useDialogFocus from "../hooks/useDialogFocus";

function ConfirmModal({ open, title, description, message, confirmText = "Confirm", cancelText = "Cancel", danger = false, busy = false, onConfirm, onCancel }) {
    const cancelRef = useRef(null);
    const dialogRef = useDialogFocus({ open, onClose: onCancel, canClose: !busy, initialFocusRef: cancelRef });
    if (!open) return null;

    return (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}>
            <div ref={dialogRef} tabIndex={-1} className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
                <h2 id="confirm-title">{title}</h2>
                <p id="confirm-description">{description || message}</p>
                <div className="modal-actions">
                    <button ref={cancelRef} type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>{cancelText}</button>
                    <button type="button" className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm} disabled={busy}>
                        {busy ? "Please wait..." : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;

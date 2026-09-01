import { useEffect, useRef } from "react";

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export default function useDialogFocus({ open = true, onClose, canClose = true, onKeyDown, initialFocusRef } = {}) {
    const dialogRef = useRef(null);
    const handlersRef = useRef({ onClose, canClose, onKeyDown });
    useEffect(() => { handlersRef.current = { onClose, canClose, onKeyDown }; }, [canClose, onClose, onKeyDown]);

    useEffect(() => {
        if (!open) return undefined;
        const dialog = dialogRef.current;
        const previousFocus = document.activeElement;
        const originalOverflow = document.body.style.overflow;
        const originalPaddingRight = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
        (initialFocusRef?.current || dialog?.querySelector(FOCUSABLE) || dialog)?.focus?.();

        const keyHandler = (event) => {
            handlersRef.current.onKeyDown?.(event);
            if (event.defaultPrevented) return;
            if (event.key === "Escape" && handlersRef.current.canClose) {
                event.preventDefault();
                handlersRef.current.onClose?.();
                return;
            }
            if (event.key !== "Tab" || !dialog) return;
            const focusable = [...dialog.querySelectorAll(FOCUSABLE)].filter((element) => element.getClientRects().length > 0);
            if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener("keydown", keyHandler);
        return () => {
            document.removeEventListener("keydown", keyHandler);
            document.body.style.overflow = originalOverflow;
            document.body.style.paddingRight = originalPaddingRight;
            previousFocus?.focus?.();
        };
    }, [initialFocusRef, open]);

    return dialogRef;
}

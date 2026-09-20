import { useEffect, useRef } from 'react';

// Native modal dialogs isolate background controls, contain keyboard focus and restore it on close.
export function useModalDialog(open: boolean) {
    const ref = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const dialog = ref.current;
        if (!open || !dialog) return;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const overflow = document.body.style.overflow;
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        return () => {
            dialog.close();
            document.body.style.overflow = overflow;
            if (previous?.isConnected) previous.focus();
        };
    }, [open]);
    return ref;
}

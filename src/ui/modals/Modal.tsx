import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  children: ReactNode;
  /** When given, tapping outside the sheet or pressing Escape closes it. Leave it out for choices the game is waiting on. */
  onClose?: () => void;
}

/** How many sheets are open: the app behind stays inert until the last one closes. */
let open = 0;

/**
 * Bottom sheet on phones, centered dialog on wider screens.
 *
 * Rendered outside the app so the game behind it can be made inert: keyboard and
 * screen-reader users can't wander into the table while a sheet is waiting on them.
 * Focus moves to the sheet's first control and goes back where it was on close.
 */
export function Modal({ title, children, onClose }: Props) {
  const sheet = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.getElementById("root");
    const node = sheet.current;
    const before = document.activeElement as HTMLElement | null;
    open += 1;
    if (root) root.inert = true;
    const first = node?.querySelector<HTMLElement>("button:not(:disabled), input, [tabindex]:not([tabindex='-1'])");
    (first ?? node)?.focus({ preventScroll: true });
    return () => {
      open -= 1;
      if (root && open === 0) root.inert = false;
      // Hand focus back only if it's still in this sheet (or lost), not if something new has taken it.
      const now = document.activeElement;
      const ours = !now || now === document.body || (node?.contains(now) ?? false);
      if (ours && before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return createPortal(
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title} onClick={onClose && ((e) => e.target === e.currentTarget && onClose())}>
      <div className="modal" ref={sheet} tabIndex={-1}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

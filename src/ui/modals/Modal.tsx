import { useEffect, type ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  /** When given, tapping outside the sheet or pressing Escape closes it. Leave it out for choices the game is waiting on. */
  onClose?: () => void;
}

/** Bottom sheet on phones, centered dialog on wider screens. */
export function Modal({ title, children, onClose }: Props) {
  useEffect(() => {
    if (!onClose) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title} onClick={onClose && ((e) => e.target === e.currentTarget && onClose())}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

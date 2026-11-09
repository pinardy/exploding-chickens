import type { ReactNode } from "react";

/** Bottom sheet on phones, centered dialog on wider screens. */
export function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal">
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

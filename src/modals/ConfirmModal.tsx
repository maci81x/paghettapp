import type { ReactNode } from "react";
import { Btn, Modal } from "../design/components";
import { P } from "../design/tokens";

/** Conferma per un'azione che non si può annullare. */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Conferma",
  danger,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** Colora di rosso il bottone: usato per le azioni distruttive. */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>{title}</h3>
      <p style={{ fontSize: 12, color: P.tx2, lineHeight: 1.5, margin: "0 0 16px" }}>{message}</p>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          style={{ flex: 1 }}
          color={danger ? P.red : undefined}
          grad={danger ? undefined : P.accG}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Btn>
        <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

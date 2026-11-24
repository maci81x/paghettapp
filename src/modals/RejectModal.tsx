import { useState } from "react";
import { Btn, Label, Modal, TextArea } from "../design/components";
import { P } from "../design/tokens";

/**
 * Rifiuto con nota. La voce non si cancella: resta nello storico con il
 * motivo, che la ragazza legge, e con la sua foto-prova se ce l'aveva.
 */
export default function RejectModal({
  what,
  count,
  onConfirm,
  onClose,
}: {
  /** "Rifarsi il letto di Mia del 13/10", o un riassunto per il rifiuto in blocco. */
  what: string;
  count: number;
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>✗ Rifiuta {count > 1 ? `${count} attività` : "l'attività"}</h3>
      <p style={{ color: P.tx3, fontSize: 12.5, margin: "0 0 12px" }}>{what}</p>
      <Label>Perché? (la ragazza lo vedrà)</Label>
      <TextArea
        autoFocus
        rows={3}
        maxLength={200}
        value={note}
        placeholder="es. Il letto era ancora da sistemare"
        onChange={(e) => setNote(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      <p style={{ color: P.tx3, fontSize: 12, margin: "0 0 12px", lineHeight: 1.45 }}>
        Nessun punto. La voce resta nello storico con la nota{count > 1 ? "" : " e l'eventuale foto"}, così se ne può riparlare.
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          style={{ flex: 1, minHeight: 48 }}
          color={P.red}
          onClick={() => {
            onConfirm(note);
            onClose();
          }}
        >
          ✗ Rifiuta
        </Btn>
        <Btn style={{ flex: 1, minHeight: 48 }} outline color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

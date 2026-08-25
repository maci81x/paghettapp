import { useState } from "react";
import { CATS, actIcon } from "../data/constants";
import type { Activity } from "../data/types";
import { Btn, Label, Modal, TextArea } from "../design/components";
import { P, alpha } from "../design/tokens";

/**
 * Penalità collegata a un'attività: l'admin sceglie quella non svolta e l'app
 * addebita esattamente i punti di penalità già configurati sull'attività, così
 * non c'è un importo da digitare (e da sbagliare).
 */
export default function ActivityPenaltyModal({
  who,
  acts,
  onSave,
  onClose,
}: {
  who: string;
  acts: Activity[];
  onSave: (act: Activity, note: string) => void;
  onClose: () => void;
}) {
  const [pick, setPick] = useState<Activity | null>(null);
  const [note, setNote] = useState("");

  const withPenalty = acts.filter((a) => a.pen < 0);

  if (withPenalty.length === 0) {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>⚠️ Addebita penalità</h3>
        <p style={{ fontSize: 12, color: P.tx2, lineHeight: 1.5, margin: "0 0 16px" }}>
          Nessuna attività ha una penalità configurata. Aprine una dalla scheda Attività e imposta i punti di penalità.
        </p>
        <Btn full outline color={P.tx3} onClick={onClose}>
          Chiudi
        </Btn>
      </Modal>
    );
  }

  if (pick) {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>⚠️ Confermi?</h3>
        <p style={{ fontSize: 13, color: P.tx, lineHeight: 1.5, margin: "0 0 4px" }}>
          Addebitare <b style={{ color: P.red }}>{pick.pen}pt</b> a {who} per{" "}
          <b>
            {actIcon(pick)} {pick.name}
          </b>
          ?
        </p>
        {note.trim() && <p style={{ fontSize: 11, color: P.tx2, lineHeight: 1.5, margin: "0 0 4px" }}>Nota: {note.trim()}</p>}
        <p style={{ fontSize: 9, color: P.tx3, margin: "0 0 14px" }}>
          Entra subito nello storico come penalità approvata: riduce il totale e la paghetta della settimana.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn style={{ flex: 1 }} color={P.red} onClick={() => onSave(pick, note.trim())}>
            ⚠️ Addebita {pick.pen}pt
          </Btn>
          <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={() => setPick(null)}>
            Indietro
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>⚠️ Addebita penalità · {who}</h3>
      <p style={{ fontSize: 10, color: P.tx3, margin: "0 0 10px" }}>Scegli l'attività non fatta: i punti sono quelli della sua penalità.</p>

      <Label>Nota (facoltativa)</Label>
      <TextArea rows={2} placeholder="Non fatto lunedì…" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginBottom: 10 }} />

      <div style={{ maxHeight: 260, overflow: "auto" }}>
        {withPenalty.map((a) => (
          <div
            key={a.id}
            onClick={() => setPick(a)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              marginBottom: 5,
              borderRadius: 10,
              cursor: "pointer",
              background: alpha(P.red, 6),
              border: `1px solid ${alpha(P.red, 18)}`,
            }}
          >
            <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>
              {actIcon(a)} {a.name}
              <span style={{ color: P.tx3, fontSize: 9, fontWeight: 500 }}> · {CATS.find((c) => c.id === a.cat)?.n ?? a.cat}</span>
            </span>
            <span style={{ color: P.red, fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{a.pen}pt</span>
          </div>
        ))}
      </div>

      <Btn full outline color={P.tx3} style={{ marginTop: 8 }} onClick={onClose}>
        Annulla
      </Btn>
    </Modal>
  );
}

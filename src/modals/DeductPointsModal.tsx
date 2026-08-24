import { useState } from "react";
import { Btn, Input, Label, Modal, Pill, TextArea } from "../design/components";
import { P } from "../design/tokens";

const QUICK = [5, 10, 20, 50];

/**
 * Punti tolti dall'admin. Separato dal bonus: qui si scrive sempre un numero
 * positivo e l'app lo sottrae, così non si sbaglia il segno.
 */
export default function DeductPointsModal({
  who,
  onSave,
  onClose,
}: {
  who: string;
  onSave: (pts: number, reason: string) => void;
  onClose: () => void;
}) {
  const [pts, setPts] = useState("10");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const n = Math.abs(parseInt(pts, 10));
  const motivo = reason.trim();
  const valid = Number.isFinite(n) && n > 0 && motivo.length > 0;

  if (confirming && valid) {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>➖ Confermi?</h3>
        <p style={{ fontSize: 13, color: P.tx, lineHeight: 1.5, margin: "0 0 4px" }}>
          Togliere <b style={{ color: P.red }}>{n} punti</b> a {who}?
        </p>
        <p style={{ fontSize: 11, color: P.tx2, lineHeight: 1.5, margin: "0 0 16px" }}>Motivo: {motivo}</p>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn style={{ flex: 1 }} color={P.red} onClick={() => onSave(n, motivo)}>
            ➖ Togli {n}pt
          </Btn>
          <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={() => setConfirming(false)}>
            Indietro
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>➖ Togli punti · {who}</h3>

      <Label>Punti da togliere</Label>
      <Input type="number" min={1} value={pts} onChange={(e) => setPts(e.target.value)} style={{ marginBottom: 6 }} />
      <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
        {QUICK.map((q) => (
          <Pill key={q} active={n === q} color={P.red} onClick={() => setPts(String(q))} s>
            −{q}
          </Pill>
        ))}
      </div>

      <Label>Motivo (obbligatorio)</Label>
      <TextArea
        rows={2}
        placeholder="Non ha fatto i compiti, ha lasciato la stanza in disordine..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      <p style={{ fontSize: 9, color: P.tx3, margin: "0 0 12px" }}>
        La voce entra subito nello storico con punti negativi e riduce il totale e la paghetta della settimana.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} color={P.red} disabled={!valid} onClick={() => valid && setConfirming(true)}>
          Continua
        </Btn>
        <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

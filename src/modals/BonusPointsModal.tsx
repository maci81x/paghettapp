import { useState } from "react";
import { Btn, Input, Label, Modal, Pill, TextArea } from "../design/components";
import { P } from "../design/tokens";

const QUICK = [5, 10, 20, -5, -10];

export default function BonusPointsModal({
  who,
  grad,
  onSave,
  onClose,
}: {
  who: string;
  grad: string;
  onSave: (pts: number, reason: string) => void;
  onClose: () => void;
}) {
  const [pts, setPts] = useState("10");
  const [reason, setReason] = useState("");

  const n = parseInt(pts, 10);
  const valid = Number.isFinite(n) && n !== 0 && reason.trim().length > 0;

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>🎁 Punti bonus · {who}</h3>

      <Label>Punti (negativi per una penalità)</Label>
      <Input type="number" value={pts} onChange={(e) => setPts(e.target.value)} style={{ marginBottom: 6 }} />
      <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
        {QUICK.map((q) => (
          <Pill key={q} active={n === q} color={q > 0 ? P.mint : P.red} onClick={() => setPts(String(q))} s>
            {q > 0 ? `+${q}` : q}
          </Pill>
        ))}
      </div>

      <Label>Motivo</Label>
      <TextArea
        rows={2}
        placeholder="Comportamento esemplare, ha aiutato senza che glielo chiedessi..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        style={{ marginBottom: 6 }}
      />
      <p style={{ fontSize: 9, color: P.tx3, margin: "0 0 12px" }}>
        I punti bonus sono già approvati: entrano subito nel totale e nella paghetta della settimana.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={grad} disabled={!valid} onClick={() => valid && onSave(n, reason.trim())}>
          Assegna
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

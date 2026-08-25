import { useState } from "react";
import { FUND_LABEL, giftNote } from "../data/constants";
import type { GiftDraft } from "../data/types";
import { Btn, Input, Label, Modal } from "../design/components";
import { P, alpha } from "../design/tokens";

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Regalo ricevuto: non è una paghetta né un'entrata extra. Va tutto nel
 * salvadanaio Personale, senza lo split 30/60/10.
 */
export default function GiftModal({
  who,
  grad,
  personaleName,
  onSave,
  onClose,
}: {
  who: string;
  grad: string;
  /** Nome che la ragazza ha dato al salvadanaio Personale. */
  personaleName: string;
  onSave: (from: string, reason: string, amount: number) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<GiftDraft>({ from: "", reason: "", amount: "" });

  const amount = num(d.amount);
  const valid = d.from.trim().length > 0 && d.reason.trim().length > 0 && amount > 0;

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>🎁 Regalo per {who}</h3>
      <p style={{ fontSize: 11, color: P.tx3, margin: "0 0 12px" }}>Va tutto nel salvadanaio {personaleName || FUND_LABEL.personale}, senza divisione.</p>

      <div style={{ marginBottom: 10 }}>
        <Label>Da chi?</Label>
        <Input value={d.from} placeholder="es. Nonna, Zia Maria, Babbo Roby" maxLength={40} onChange={(e) => setD((p) => ({ ...p, from: e.target.value }))} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <Label>Per cosa?</Label>
        <Input value={d.reason} placeholder="es. Compleanno, maglia nuova" maxLength={60} onChange={(e) => setD((p) => ({ ...p, reason: e.target.value }))} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <Label>Quanto €</Label>
        <Input type="number" inputMode="decimal" value={d.amount} placeholder="0.00" onChange={(e) => setD((p) => ({ ...p, amount: e.target.value }))} />
      </div>

      {valid && (
        <p
          style={{
            background: alpha(P.gold, 8),
            border: `1px solid ${alpha(P.gold, 18)}`,
            borderRadius: 10,
            padding: 10,
            fontSize: 12,
            color: P.tx,
            margin: "0 0 12px",
            lineHeight: 1.45,
          }}
        >
          🎁 Regalo di <b>€{amount.toFixed(2)}</b> da <b>{d.from.trim()}</b> per {d.reason.trim()}
          <span style={{ display: "block", color: P.tx3, fontSize: 10, marginTop: 3 }}>{giftNote(d.from, d.reason)}</span>
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={grad} disabled={!valid} onClick={() => valid && onSave(d.from.trim(), d.reason.trim(), amount)}>
          🎁 Registra
        </Btn>
        <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

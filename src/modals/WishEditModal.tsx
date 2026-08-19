import { useState } from "react";
import { FUNDS, FUND_LABEL } from "../data/constants";
import type { Fund, Wish, WishDraft } from "../data/types";
import { Btn, Input, Label, Modal, Pill, Sel } from "../design/components";
import { P } from "../design/tokens";

const PRIOS: { v: 1 | 2 | 3; l: string }[] = [
  { v: 1, l: "⭐⭐⭐ Alta" },
  { v: 2, l: "⭐⭐ Media" },
  { v: 3, l: "⭐ Bassa" },
];

export default function WishEditModal({
  init,
  color,
  onSave,
  onClose,
}: {
  init: WishDraft;
  color: string;
  onSave: (wish: Omit<Wish, "id" | "done">) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<WishDraft>(init);
  const cost = parseFloat(d.cost.replace(",", "."));
  const valid = d.name.trim().length > 0 && cost > 0;

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{d.mode === "add" ? "🎁 Nuovo desiderio" : "🎁 Modifica desiderio"}</h3>

      <Label>Cosa vuoi comprare?</Label>
      <Input placeholder="AirPods, zaino nuovo..." value={d.name} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} style={{ marginBottom: 8 }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Costo €</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={d.cost} onChange={(e) => setD((x) => ({ ...x, cost: e.target.value }))} />
        </div>
        <div>
          <Label>Da quale salvadanaio</Label>
          <Sel value={d.fund} onChange={(e) => setD((x) => ({ ...x, fund: e.target.value as Fund }))}>
            {FUNDS.map((k) => (
              <option key={k} value={k}>
                {FUND_LABEL[k]}
              </option>
            ))}
          </Sel>
        </div>
      </div>

      <Label>Priorità</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {PRIOS.map((p) => (
          <Pill key={p.v} active={d.priority === p.v} color={color} onClick={() => setD((x) => ({ ...x, priority: p.v }))} s>
            {p.l}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          style={{ flex: 1 }}
          grad={P.mintG}
          disabled={!valid}
          onClick={() => valid && onSave({ name: d.name.trim(), cost: +cost.toFixed(2), fund: d.fund, priority: d.priority })}
        >
          {d.mode === "add" ? "Aggiungi" : "Salva"}
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

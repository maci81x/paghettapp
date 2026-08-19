import { useState } from "react";
import type { Fund, SpesaDraft } from "../data/types";
import { Btn, Input, Label, Modal, Sel } from "../design/components";
import { P } from "../design/tokens";

/** Salvadanai che meritano una domanda in più prima del prelievo. */
const WARN: Partial<Record<Fund, { icon: string; text: (a: number) => string }>> = {
  risparmio: {
    icon: "⚠️",
    text: (a) =>
      `I tuoi risparmi stanno crescendo grazie agli investimenti di Babbo Roby. Se li prelevi ora perdi il rendimento futuro. Sei sicura di voler prelevare €${a.toFixed(2)} dal Risparmio?`,
  },
  beneficenza: {
    icon: "💛",
    text: () => "Questo salvadanaio è per aiutare gli altri. Sei sicura di voler usare questi soldi per te?",
  },
};

export default function SpesaModal({
  draft,
  setDraft,
  balance,
  onSave,
  onClose,
}: {
  draft: SpesaDraft;
  setDraft: (fn: (d: SpesaDraft) => SpesaDraft) => void;
  balance: number;
  onSave: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const amount = parseFloat(draft.a);
  const valid = draft.ds.trim().length > 0 && amount > 0;
  const overBalance = valid && amount > balance;
  const warn = WARN[draft.f];

  if (confirming && warn) {
    return (
      <Modal onClose={() => setConfirming(false)}>
        <p style={{ fontSize: 34, textAlign: "center", margin: "4px 0 8px" }}>{warn.icon}</p>
        <p style={{ color: P.tx, fontSize: 13, lineHeight: 1.6, textAlign: "center", margin: "0 0 8px" }}>{warn.text(amount)}</p>
        <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", margin: "0 0 16px" }}>
          {draft.ds.trim()} · €{amount.toFixed(2)}
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn style={{ flex: 1 }} color={P.red} onClick={onSave}>
            Sì, preleva
          </Btn>
          <Btn style={{ flex: 1 }} grad={P.mintG} onClick={() => setConfirming(false)}>
            No, ci ripenso
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Nuova spesa</h3>
      <Label>Per cosa?</Label>
      <Input placeholder="Es: Gelato" value={draft.ds} onChange={(e) => setDraft((d) => ({ ...d, ds: e.target.value }))} style={{ marginBottom: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Importo €</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={draft.a} onChange={(e) => setDraft((d) => ({ ...d, a: e.target.value }))} />
        </div>
        <div>
          <Label>Da quale salvadanaio</Label>
          <Sel value={draft.f} onChange={(e) => setDraft((d) => ({ ...d, f: e.target.value as Fund }))}>
            <option value="personale">Personale</option>
            <option value="risparmio">Risparmio</option>
            <option value="beneficenza">Beneficenza</option>
          </Sel>
        </div>
      </div>
      <p style={{ fontSize: 10, color: overBalance ? P.red : P.tx3, margin: "0 0 10px" }}>
        Disponibile: €{balance.toFixed(2)}
        {overBalance && " · importo superiore al saldo"}
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={P.mintG} onClick={() => (warn ? setConfirming(true) : onSave())} disabled={!valid}>
          Registra
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

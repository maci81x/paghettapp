import { useState } from "react";
import type { Fund, SpesaDraft } from "../data/types";
import { Btn, Input, Label, Modal, Sel } from "../design/components";
import { P } from "../design/tokens";
import { parseAmount, fmtEuro } from "../utils/money";

/** Salvadanai che meritano una domanda in più prima del prelievo. */
const WARN: Partial<Record<Fund, { icon: string; text: (a: number) => string }>> = {
  risparmio: {
    icon: "⚠️",
    text: (a) =>
      `I tuoi risparmi stanno crescendo grazie agli investimenti di Babbo Roby. Se li prelevi ora perdi il rendimento futuro. Sei sicura di voler prelevare ${fmtEuro(a)} dal Risparmio?`,
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
  plannedSupported,
  onSave,
  onClose,
}: {
  draft: SpesaDraft;
  setDraft: (fn: (d: SpesaDraft) => SpesaDraft) => void;
  balance: number;
  /** false finché il database non sa salvare le spese previste. */
  plannedSupported: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const amount = parseAmount(draft.a) ?? 0;
  const valid = draft.ds.trim().length > 0 && amount > 0;
  const overBalance = valid && amount > balance;
  const planned = plannedSupported && draft.planned;
  // per una spesa solo prevista i soldi non escono ancora: la domanda arriva dopo
  const warn = planned ? undefined : WARN[draft.f];

  if (confirming && warn) {
    return (
      <Modal onClose={() => setConfirming(false)}>
        <p style={{ fontSize: 34, textAlign: "center", margin: "4px 0 8px" }}>{warn.icon}</p>
        <p style={{ color: P.tx, fontSize: 13, lineHeight: 1.6, textAlign: "center", margin: "0 0 8px" }}>{warn.text(amount)}</p>
        <p style={{ color: P.tx3, fontSize: 12.5, textAlign: "center", margin: "0 0 16px" }}>
          {draft.ds.trim()} · {fmtEuro(amount)}
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
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Registra spesa</h3>
      {plannedSupported && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <Btn small outline={!planned} color={P.gold} style={{ flex: 1, minHeight: 44 }} onClick={() => setDraft((d) => ({ ...d, planned: true }))}>
            ⏳ La farò
          </Btn>
          <Btn small outline={planned} color={P.red} style={{ flex: 1, minHeight: 44 }} onClick={() => setDraft((d) => ({ ...d, planned: false }))}>
            ✓ Già fatta
          </Btn>
        </div>
      )}
      <Label>Per cosa?</Label>
      <Input placeholder="Es: Gelato" value={draft.ds} onChange={(e) => setDraft((d) => ({ ...d, ds: e.target.value }))} style={{ marginBottom: 8 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>{planned ? "Importo previsto €" : "Importo €"}</Label>
          <Input inputMode="decimal" placeholder="0,00" value={draft.a} onChange={(e) => setDraft((d) => ({ ...d, a: e.target.value }))} />
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
      <p style={{ fontSize: 12, color: overBalance ? P.red : P.tx3, margin: "0 0 10px" }}>
        Disponibile: {fmtEuro(balance)}
        {overBalance && " · importo superiore al saldo"}
      </p>
      {planned && (
        <p style={{ fontSize: 12, color: P.tx3, margin: "-4px 0 10px", lineHeight: 1.5 }}>
          Il saldo non cambia adesso: quando avrai speso davvero, tocca la spesa e scrivi quanto è costata.
        </p>
      )}
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

import { useState } from "react";
import { DEFAULT_PCT, FUNDS, FUND_LABEL, splitByPct, todayISO } from "../data/constants";
import type { Fund, IncomeDraft, IncomeEntry } from "../data/types";
import { Btn, Input, Label, Modal } from "../design/components";
import { P } from "../design/tokens";

const initDraft = (): IncomeDraft => ({
  amount: "",
  source: "",
  date: todayISO(),
  split: { risparmio: String(DEFAULT_PCT.risparmio), personale: String(DEFAULT_PCT.personale), beneficenza: String(DEFAULT_PCT.beneficenza) },
});

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function ExtraIncomeModal({
  who,
  grad,
  onSave,
  onClose,
}: {
  who: string;
  grad: string;
  onSave: (entry: Omit<IncomeEntry, "id">) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<IncomeDraft>(initDraft);

  const amount = num(d.amount);
  const pct = { risparmio: num(d.split.risparmio), personale: num(d.split.personale), beneficenza: num(d.split.beneficenza) };
  const sum = +(pct.risparmio + pct.personale + pct.beneficenza).toFixed(2);
  const quote = splitByPct(amount, pct);
  const validSum = sum === 100;
  const valid = amount > 0 && d.source.trim().length > 0 && !!d.date && validSum;

  const save = () => {
    if (!valid) return;
    onSave({ date: d.date, amount: +amount.toFixed(2), source: d.source.trim(), split: pct, type: "extra" });
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>💝 Registra entrata · {who}</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Importo €</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={d.amount} onChange={(e) => setD((x) => ({ ...x, amount: e.target.value }))} />
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" value={d.date} onChange={(e) => setD((x) => ({ ...x, date: e.target.value }))} />
        </div>
      </div>

      <Label>Fonte</Label>
      <Input placeholder="Nonni, Compleanno, Lavoretto..." value={d.source} onChange={(e) => setD((x) => ({ ...x, source: e.target.value }))} style={{ marginBottom: 10 }} />

      <Label>Come dividerla (%)</Label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 6 }}>
        {FUNDS.map((k: Fund) => (
          <div key={k}>
            <Input
              type="number"
              value={d.split[k]}
              onChange={(e) => setD((x) => ({ ...x, split: { ...x.split, [k]: e.target.value } }))}
              style={{ textAlign: "center" }}
            />
            <p style={{ fontSize: 9, color: P.tx3, margin: "3px 0 0", textAlign: "center" }}>{FUND_LABEL[k]}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10, color: validSum ? P.tx3 : P.red, margin: "0 0 4px" }}>
        Totale {sum}%{!validSum && " · la somma deve fare 100%"}
      </p>
      <p style={{ fontSize: 11, color: P.mint, margin: "0 0 12px" }}>
        🏦 €{quote.risparmio.toFixed(2)} · 🎒 €{quote.personale.toFixed(2)} · 🤝 €{quote.beneficenza.toFixed(2)}
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={grad} onClick={save} disabled={!valid}>
          Registra
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

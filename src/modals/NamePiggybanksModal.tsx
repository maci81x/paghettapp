import { useState } from "react";
import { FUND_NAME_MAX, FUND_NAME_MIN, validFundName } from "../data/constants";
import type { Fund, User } from "../data/types";
import { Btn, Input, Label, Modal } from "../design/components";
import { P } from "../design/tokens";

/** Ordine e testi di questa schermata: si parla alla ragazza, non ai fondi. */
const FIELDS: { k: Fund; label: string; placeholder: string }[] = [
  { k: "personale", label: "💰 Personale — come lo chiami?", placeholder: "es. Il mio tesoretto" },
  { k: "risparmio", label: "🏦 Risparmio — come lo chiami?", placeholder: "es. Per il futuro" },
  { k: "beneficenza", label: "💛 Beneficenza — come lo chiami?", placeholder: "es. Per chi ha bisogno" },
];

const empty = (u?: User): Record<Fund, string> => ({
  risparmio: u?.wNick?.risparmio ?? "",
  personale: u?.wNick?.personale ?? "",
  beneficenza: u?.wNick?.beneficenza ?? "",
});

/**
 * Battesimo dei salvadanai. Compare prima di tutto il resto e non si chiude
 * finché i tre nomi non ci sono: è la ragazza a doverli scegliere, e senza
 * nomi l'admin non può nemmeno accreditare la prima paghetta.
 */
export default function NamePiggybanksModal({ u, grad, onSave }: { u?: User; grad: string; onSave: (names: Record<Fund, string>) => void }) {
  const [names, setNames] = useState<Record<Fund, string>>(() => empty(u));

  const allValid = FIELDS.every((f) => validFundName(names[f.k]));
  const set = (k: Fund, v: string) => setNames((p) => ({ ...p, [k]: v.slice(0, FUND_NAME_MAX) }));

  return (
    <Modal onClose={() => {}}>
      <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 6px", letterSpacing: -0.3 }}>✨ Dai un nome ai tuoi salvadanai!</h3>
      <p style={{ fontSize: 12, color: P.tx2, lineHeight: 1.5, margin: "0 0 14px" }}>
        Prima di iniziare, scegli un nome speciale per ognuno dei tuoi salvadanai
      </p>

      {FIELDS.map((f) => {
        const v = names[f.k];
        const tooShort = v.trim().length > 0 && v.trim().length < FUND_NAME_MIN;
        return (
          <div key={f.k} style={{ marginBottom: 10 }}>
            <Label>{f.label}</Label>
            <Input value={v} placeholder={f.placeholder} maxLength={FUND_NAME_MAX} onChange={(e) => set(f.k, e.target.value)} />
            <p style={{ fontSize: 9, color: tooShort ? P.red : P.tx3, margin: "3px 0 0" }}>
              {tooShort ? `Almeno ${FUND_NAME_MIN} caratteri` : `${v.trim().length}/${FUND_NAME_MAX}`}
            </p>
          </div>
        );
      })}

      <Btn full grad={grad} disabled={!allValid} style={{ marginTop: 4 }} onClick={() => allValid && onSave(names)}>
        ✅ Salva
      </Btn>
      {!allValid && <p style={{ fontSize: 10, color: P.tx3, textAlign: "center", margin: "8px 0 0" }}>Servono tutti e tre i nomi per continuare</p>}
    </Modal>
  );
}

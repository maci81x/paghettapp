import { useState } from "react";
import { fundName } from "../data/constants";
import type { Spesa, User } from "../data/types";
import { Btn, Input, Label, Modal } from "../design/components";
import { P } from "../design/tokens";
import { parseAmount } from "../utils/money";

/** "Quanto hai speso?": trasforma una spesa prevista in effettiva. */
export default function SettleSpesaModal({
  u,
  spesa,
  onSettle,
  onCancel,
  onClose,
}: {
  u: User;
  spesa: Spesa;
  onSettle: (amount: number) => void;
  /** La spesa non c'è stata: si toglie dall'elenco. */
  onCancel: () => void;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState(spesa.a.toFixed(2).replace(".", ","));
  const amount = parseAmount(raw);
  const diff = amount !== null ? spesa.a - amount : 0;
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Quanto hai speso?</h3>
      <p style={{ color: P.tx3, fontSize: 11, margin: "0 0 12px" }}>
        {spesa.ds} · previsto €{spesa.a.toFixed(2)} da {fundName(u, spesa.f)}
      </p>
      <Label>Importo effettivo €</Label>
      <Input inputMode="decimal" autoFocus value={raw} onChange={(e) => setRaw(e.target.value)} style={{ marginBottom: 6 }} />
      {amount !== null && Math.abs(diff) >= 0.01 && (
        <p style={{ fontSize: 11, color: diff > 0 ? P.mint : P.gold, margin: "0 0 8px", fontWeight: 600 }}>
          {diff > 0 ? `👏 Hai speso €${diff.toFixed(2)} meno del previsto!` : `Hai speso €${(-diff).toFixed(2)} più del previsto.`}
        </p>
      )}
      <p style={{ fontSize: 10, color: P.tx3, margin: "0 0 12px" }}>
        Disponibile: €{u.w[spesa.f].toFixed(2)} · l'importo esce dal salvadanaio adesso.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Btn style={{ flex: 1, minHeight: 48 }} grad={P.mintG} disabled={amount === null} onClick={() => amount !== null && onSettle(amount)}>
          ✓ Speso
        </Btn>
        <Btn style={{ flex: 1, minHeight: 48 }} color={P.tx3} onClick={onClose}>
          Più tardi
        </Btn>
      </div>
      <Btn full small outline color={P.red} onClick={onCancel}>
        ✗ Alla fine non l'ho comprato
      </Btn>
    </Modal>
  );
}

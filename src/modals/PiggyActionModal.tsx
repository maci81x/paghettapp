import { useState } from "react";
import { fundName } from "../data/constants";
import type { Fund, User } from "../data/types";
import { Btn, Input, Label, Modal } from "../design/components";
import { P, alpha } from "../design/tokens";

export type PiggyAction = "redeem" | "reset";

export interface PiggyActionDraft {
  mode: PiggyAction;
  fund: Fund;
}

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Riscatto e azzeramento di un salvadanaio. In entrambi i casi i soldi escono
 * dall'app perché passano di mano davvero: resta una spesa a storico.
 */
export default function PiggyActionModal({
  draft,
  u,
  onRedeem,
  onReset,
  onClose,
}: {
  draft: PiggyActionDraft;
  u: User;
  onRedeem: (fund: Fund, amount: number, reason: string) => void;
  onReset: (fund: Fund) => void;
  onClose: () => void;
}) {
  const balance = u.w[draft.fund];
  const [amount, setAmount] = useState(String(balance.toFixed(2)));
  const [reason, setReason] = useState("");

  const value = Math.min(balance, num(amount));
  const validRedeem = value > 0 && reason.trim().length > 0;
  const name = fundName(u, draft.fund);

  if (draft.mode === "reset") {
    return (
      <Modal onClose={onClose}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>🔄 Azzerare {name}?</h3>
        <p style={{ fontSize: 12, color: P.tx2, lineHeight: 1.5, margin: "0 0 16px" }}>
          Il salvadanaio {name} di <b style={{ color: P.tx }}>{u.n}</b> passa da <b style={{ color: P.mint }}>€{balance.toFixed(2)}</b> a zero. Resta
          una spesa a storico, e gli interessi già accreditati restano nello storico interessi.
          <span style={{ display: "block", color: P.red, fontWeight: 700, marginTop: 6 }}>Questa azione non è reversibile.</span>
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn
            style={{ flex: 1 }}
            color={P.red}
            disabled={balance <= 0}
            onClick={() => {
              onReset(draft.fund);
              onClose();
            }}
          >
            Azzera €{balance.toFixed(2)}
          </Btn>
          <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={onClose}>
            Annulla
          </Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>💸 Riscatta {name}</h3>
      <p style={{ fontSize: 11, color: P.tx3, margin: "0 0 12px" }}>
        Saldo disponibile: <b style={{ color: P.mint }}>€{balance.toFixed(2)}</b>. I soldi escono dall'app perché li consegni a mano.
      </p>

      <Label>Quanto vuoi dare a {u.n}?</Label>
      <Input type="number" inputMode="decimal" max={balance} value={amount} onChange={(e) => setAmount(e.target.value)} style={{ marginBottom: 4 }} />
      {num(amount) > balance && <p style={{ color: P.gold, fontSize: 10, margin: "0 0 6px" }}>Il massimo è €{balance.toFixed(2)}: userò quello.</p>}

      <Label>Motivo</Label>
      <Input
        value={reason}
        placeholder="es. Compra bicicletta, riscatto parziale"
        maxLength={80}
        onChange={(e) => setReason(e.target.value)}
        style={{ marginBottom: 12 }}
      />

      {validRedeem && (
        <p style={{ background: alpha(P.gold, 8), border: `1px solid ${alpha(P.gold, 18)}`, borderRadius: 10, padding: 10, fontSize: 12, color: P.tx, margin: "0 0 12px" }}>
          💸 <b>€{value.toFixed(2)}</b> escono da {name} e vanno a {u.n} — {reason.trim()}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn
          style={{ flex: 1 }}
          grad={P.goldG}
          disabled={!validRedeem}
          onClick={() => {
            onRedeem(draft.fund, value, reason);
            onClose();
          }}
        >
          Riscatta €{value.toFixed(2)}
        </Btn>
        <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

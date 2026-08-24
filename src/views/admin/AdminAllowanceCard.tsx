import { useState } from "react";
import { FUNDS, FUND_LABEL, getTier } from "../../data/constants";
import type { Fund, Payment, User } from "../../data/types";
import { Btn, GlassCard, InfoTip } from "../../design/components";
import { P } from "../../design/tokens";
import { fmtDay, fmtDayTime } from "../../utils/dates";

/** Registro della paghetta settimanale: anteprima dello split e conferma del pagamento. */
export default function AdminAllowanceCard({
  u,
  due,
  paid,
  onPay,
  onUndo,
}: {
  u: User;
  due: { pts: number; amount: number; split: Record<Fund, number> };
  /** Accredito della settimana corrente, se già fatto. */
  paid?: Payment;
  onPay: () => void;
  onUndo: (week: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const tier = getTier(due.pts);
  const history = (u.pays ?? []).slice(0, 4);

  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>
          📤 Paghetta settimanale
          <InfoTip text="L'accredito divide l'importo fra i tre salvadanai e azzera i punti della settimana. Una settimana si paga una volta sola." />
        </p>
        {paid && <span style={{ color: P.mint, fontSize: 11, fontWeight: 700 }}>✓ Pagata €{paid.amount.toFixed(2)}</span>}
      </div>

      {paid ? (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <p style={{ color: P.tx3, fontSize: 10, margin: 0 }}>
            Settimana del {paid.week} · {paid.pts}pt ·{" "}
            {paid.confirmed ? (
              <b style={{ color: P.mint }}>✅ Ricevuta il {fmtDayTime(paid.confirmedAt ?? paid.date)}</b>
            ) : (
              <b style={{ color: P.gold }}>⏳ In attesa di conferma</b>
            )}
          </p>
          <Btn small outline color={P.tx3} onClick={() => onUndo(paid.week)}>
            Annulla
          </Btn>
        </div>
      ) : !open ? (
        <Btn full grad={P.goldG} onClick={() => setOpen(true)}>
          📤 Registra paghetta settimanale
        </Btn>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ color: P.tx2, fontSize: 11 }}>Tier raggiunto</span>
            <span style={{ color: P.tx, fontSize: 15, fontWeight: 800 }}>
              {due.pts}pt <span style={{ color: P.tx3, fontWeight: 600 }}>→</span> <span style={{ color: P.gold }}>€{tier.r}</span>
            </span>
          </div>

          {FUNDS.map((k) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
              <span style={{ color: P.tx }}>{FUND_LABEL[k]}</span>
              <span style={{ color: P.mint, fontWeight: 700 }}>€{due.split[k].toFixed(2)}</span>
            </div>
          ))}

          <p style={{ color: P.tx3, fontSize: 9, margin: "8px 0 10px" }}>
            Dopo il pagamento i punti della settimana ripartono da zero e {u.n} riceve la richiesta di conferma.
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn style={{ flex: 1 }} grad={P.mintG} onClick={onPay} disabled={due.amount <= 0}>
              ✅ Conferma pagamento
            </Btn>
            <Btn outline color={P.tx3} onClick={() => setOpen(false)}>
              Annulla
            </Btn>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${P.gb}` }}>
          <p style={{ color: P.tx3, fontSize: 10, margin: "0 0 4px" }}>Ultimi accrediti</p>
          {history.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
              <span style={{ color: P.tx2 }}>
                {p.week} · {p.pts}pt
              </span>
              <span style={{ color: p.confirmed ? P.mint : P.gold }}>
                €{p.amount.toFixed(2)} · {p.confirmed ? `✅ ${fmtDay(p.confirmedAt ?? p.date)}` : "⏳ in attesa"}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

import { useState } from "react";
import { FUNDS, fundName, getTier, getWeekStart, hasFundNames } from "../../data/constants";
import type { Fund, Payment, User } from "../../data/types";
import { prevWeekStart } from "../../data/weekBounds";
import { Btn, GlassCard, InfoTip, Pill } from "../../design/components";
import { P } from "../../design/tokens";
import { fmtDay, fmtDayTime } from "../../utils/dates";

/** Registro della paghetta settimanale: anteprima dello split e conferma del pagamento. */
export default function AdminAllowanceCard({
  u,
  dueFor,
  paidFor,
  namesRequired,
  onPay,
  onUndo,
}: {
  u: User;
  /** Anteprima dell'accredito di una settimana, dal lunedì ISO che la identifica. */
  dueFor: (week: string) => { pts: number; amount: number; split: Record<Fund, number> };
  /** Accredito già registrato per quella settimana, se c'è. */
  paidFor: (week: string) => Payment | undefined;
  /** Falso finché il database non ha la colonna dei nomi: non si può pretenderli. */
  namesRequired: boolean;
  onPay: (week: string) => void;
  onUndo: (week: string) => void;
}) {
  const [open, setOpen] = useState(false);
  // la paghetta si registra quasi sempre a settimana finita: bisogna poter dire quale si sta chiudendo
  const weeks = [
    { iso: getWeekStart(), l: "Questa settimana" },
    { iso: prevWeekStart(), l: "Scorsa settimana" },
  ];
  const [week, setWeek] = useState(weeks[0].iso);
  const due = dueFor(week);
  const paid = paidFor(week);
  const tier = getTier(due.pts);
  // i salvadanai li battezza la ragazza: senza nomi l'accredito finirebbe in
  // contenitori che per lei non hanno ancora un'identità
  const blocked = namesRequired && !hasFundNames(u);
  const history = (u.pays ?? []).slice(0, 4);

  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>
          📤 Paghetta settimanale
          <InfoTip text="L'accredito divide l'importo fra i tre salvadanai. I punti restano nella settimana in cui le attività sono state fatte: una settimana si paga una volta sola." />
        </p>
        {paid && <span style={{ color: P.mint, fontSize: 11, fontWeight: 700 }}>✓ Pagata €{paid.amount.toFixed(2)}</span>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {weeks.map((w) => (
          <Pill key={w.iso} active={week === w.iso} onClick={() => setWeek(w.iso)} color={P.gold}>
            {w.l}
          </Pill>
        ))}
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
      ) : blocked ? (
        <p style={{ color: P.gold, fontSize: 12, margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
          ⚠️ {u.n} non ha ancora dato un nome ai salvadanai. Chiedi a {u.n} di farlo prima!
          <span style={{ display: "block", color: P.tx3, fontSize: 10, fontWeight: 400, marginTop: 4 }}>
            Li trova al primo accesso, oppure nel suo Profilo → 🐷 I miei salvadanai.
          </span>
        </p>
      ) : !open ? (
        <Btn full grad={P.goldG} onClick={() => setOpen(true)}>
          📤 Registra la paghetta della settimana del {week}
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
              <span style={{ color: P.tx }}>{fundName(u, k)}</span>
              <span style={{ color: P.mint, fontWeight: 700 }}>€{due.split[k].toFixed(2)}</span>
            </div>
          ))}

          <p style={{ color: P.tx3, fontSize: 9, margin: "8px 0 10px" }}>
            I punti restano nella settimana in cui sono stati fatti; quella nuova riparte da zero il lunedì. Dopo il pagamento {u.n} riceve la richiesta di conferma.
          </p>

          <div style={{ display: "flex", gap: 8 }}>
            <Btn style={{ flex: 1 }} grad={P.mintG} onClick={() => onPay(week)} disabled={due.amount <= 0}>
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

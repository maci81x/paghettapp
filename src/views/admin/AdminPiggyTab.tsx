import { FUNDS, FUND_LABEL, PERIOD_MONTHS, SPLIT, USER_IDS, YIELD_YEAR, fundName } from "../../data/constants";
import { prevWeekStart, weekLabel } from "../../data/weekBounds";
import type { Fund, Payment, Period, UserId, Users } from "../../data/types";
import { Btn, GlassCard, InfoTip, PeriodBar } from "../../design/components";
import { P, alpha } from "../../design/tokens";
import MonthReportCard from "../MonthReportCard";
import { fmtEuro } from "../../utils/money";

const SPLIT_LABEL = FUNDS.map((k) => `${SPLIT[k] * 100}% ${FUND_LABEL[k].split(" ")[1]}`).join(" · ");

export default function AdminPiggyTab({
  users,
  period,
  setPeriod,
  duePreview,
  paymentFor,
  onPay,
  onUndo,
  onIncome,
}: {
  users: Users;
  period: Period;
  setPeriod: (p: Period) => void;
  duePreview: (uid: UserId) => { pts: number; amount: number; split: Record<Fund, number> };
  paymentFor: (uid: UserId) => Payment | undefined;
  onPay: (uid: UserId) => void;
  onUndo: (uid: UserId, week: string) => void;
  onIncome: (uid: UserId) => void;
}) {
  const months = PERIOD_MONTHS[period];
  const total = (uid: (typeof USER_IDS)[number]) => FUNDS.reduce((s, k) => s + users[uid].w[k], 0);
  const family = USER_IDS.reduce((s, uid) => s + total(uid), 0);

  return (
    <div>
      <PeriodBar v={period} set={setPeriod} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {USER_IDS.map((uid) => (
          <MonthReportCard key={uid} u={users[uid]} title={`📊 ${users[uid].n}`} />
        ))}
      </div>

      {USER_IDS.map((uid) => {
        const u = users[uid];
        const rend = (u.w.risparmio * YIELD_YEAR * months) / 12;
        const due = duePreview(uid);
        const paid = paymentFor(uid);
        return (
          <GlassCard key={uid} style={{ background: `linear-gradient(135deg,${u.c}06,transparent)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div
                style={{ width: 40, height: 40, borderRadius: 12, background: u.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, boxShadow: `0 4px 14px ${u.c}33` }}
              >
                {u.av}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: P.tx, fontWeight: 700, fontSize: 14, margin: 0 }}>{u.n}</p>
                <p style={{ color: P.gold, fontWeight: 800, fontSize: 17, margin: 0 }}>{fmtEuro(total(uid))}</p>
              </div>
              <Btn small grad={P.mintG} onClick={() => onIncome(uid)}>
                💝 Entrata
              </Btn>
            </div>
            {FUNDS.map((k) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${P.gb}`, fontSize: 12.5 }}>
                <div>
                  <span style={{ color: P.tx }}>{fundName(users[uid], k)}</span>
                  <p style={{ color: P.tx3, fontSize: 11.5, margin: 0 }}>{u.wN[k]}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ color: P.mint, fontWeight: 700 }}>{fmtEuro(u.w[k])}</span>
                  {k === "risparmio" && <p style={{ fontSize: 11.5, color: P.gold, margin: 0 }}>+{fmtEuro(rend)} rend.</p>}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${P.gb}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ color: P.tx, fontSize: 12, fontWeight: 700, margin: 0 }}>
                    💸 Paghetta {weekLabel(prevWeekStart())}{" "}
                    <InfoTip
                      text={`Accredito diviso ${SPLIT_LABEL}. Si registra la settimana appena conclusa, una volta sola. Per gli arretrati apri la scheda della figlia.`}
                    />
                  </p>
                  <p style={{ color: P.tx3, fontSize: 12, margin: "2px 0 0" }}>
                    {due.pts}pt → <b style={{ color: P.gold }}>{fmtEuro(due.amount)}</b> · {FUNDS.map((k) => `${fmtEuro(due.split[k])}`).join(" / ")}
                  </p>
                </div>
                {paid ? (
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: P.mint, fontSize: 12.5, fontWeight: 700, margin: 0 }}>✓ Pagata {fmtEuro(paid.amount)}</p>
                    <Btn small color={P.tx3} style={{ marginTop: 4 }} onClick={() => onUndo(uid, paid.week)}>
                      Annulla
                    </Btn>
                  </div>
                ) : (
                  <Btn small grad={P.goldG} onClick={() => onPay(uid)}>
                    Paga {fmtEuro(due.amount)}
                  </Btn>
                )}
              </div>
              {(u.pays ?? []).length > 0 && (
                <p style={{ color: P.tx3, fontSize: 11.5, margin: "6px 0 0" }}>
                  Ultimi accrediti: {(u.pays ?? []).slice(0, 3).map((p) => `${p.week} ${p.outside ? "💵 fuori app" : `${fmtEuro(p.amount)}`}`).join(" · ")}
                </p>
              )}
            </div>
          </GlassCard>
        );
      })}
      <GlassCard style={{ background: alpha(P.gold, 3), border: `1px solid ${alpha(P.gold, 10)}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>💰 Totale Famiglia</span>
          <span style={{ color: P.gold, fontWeight: 800, fontSize: 20 }}>{fmtEuro(family)}</span>
        </div>
      </GlassCard>
    </div>
  );
}

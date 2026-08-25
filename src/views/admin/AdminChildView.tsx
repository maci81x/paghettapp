import { Suspense, lazy } from "react";
import { FUNDS, PERIOD_MONTHS, TODS, YIELD_YEAR, fundName, getLvl, getTier } from "../../data/constants";
import type { Activity, Fund, LogEntry, Payment, Period, UserId, Users } from "../../data/types";
import { Avatar, Btn, GlassCard, PeriodBar } from "../../design/components";
import { P } from "../../design/tokens";
import { allIncome } from "../../data/report";
import MonthReportCard from "../MonthReportCard";
import AdminAllowanceCard from "./AdminAllowanceCard";
import AdminLogHistory from "./AdminLogHistory";

// recharts (~450KB) resta fuori dal bundle iniziale: arriva solo quando l'admin
// apre la scheda di una figlia.
const AdminSavingsCard = lazy(() => import("./AdminSavingsCard"));

export default function AdminChildView({
  uid,
  users,
  acts,
  todayPts,
  weekPts,
  period,
  setPeriod,
  due,
  paid,
  onPay,
  onUndoPay,
  onApprove,
  onReject,
  onRevoke,
  onDeleteLog,
  onDeduct,
  onIncome,
  onBonus,
  namesRequired,
}: {
  uid: UserId;
  users: Users;
  acts: Activity[];
  todayPts: number;
  weekPts: number;
  period: Period;
  setPeriod: (p: Period) => void;
  due: { pts: number; amount: number; split: Record<Fund, number> };
  /** Accredito della settimana corrente, se già fatto. */
  paid?: Payment;
  onPay: () => void;
  onUndoPay: (week: string) => void;
  onApprove: (uid: UserId, logId: number) => void;
  onReject: (uid: UserId, logId: number) => void;
  onRevoke: (l: LogEntry, name: string) => void;
  onDeleteLog: (l: LogEntry, name: string) => void;
  onDeduct: () => void;
  onIncome: () => void;
  onBonus: () => void;
  /** Falso finché il database non ha la colonna dei nomi dei salvadanai. */
  namesRequired: boolean;
}) {
  const u = users[uid];
  const lvl = getLvl(u.totalPts);
  const tier = getTier(weekPts);
  const months = PERIOD_MONTHS[period];
  const pending = u.log.filter((l) => !l.ok && !l.revoked);
  const total = FUNDS.reduce((s, k) => s + u.w[k], 0);
  const income = allIncome(u).slice(0, 8);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Avatar photo={u.profilePhoto} emoji={u.av} size={52} radius={16} grad={u.grad} style={{ boxShadow: `0 6px 18px ${u.c}33` }} />
        <div>
          <p style={{ color: P.tx, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
            {u.n}
            {u.nickname?.trim() && <span style={{ color: P.tx3, fontSize: 12, fontWeight: 600 }}> ({u.nickname.trim()})</span>}
          </p>
          <p style={{ color: P.tx2, fontSize: 11, margin: 0 }}>
            {lvl.i} {lvl.n} · {u.totalPts}pt totali
          </p>
          <p style={{ color: P.tx3, fontSize: 10, margin: 0 }}>
            Oggi: <b style={{ color: P.mint }}>+{todayPts}pt</b> · Settimana: <b style={{ color: P.gold }}>+{weekPts}pt → €{tier.r}</b> · 🔥{u.streak}gg
          </p>
        </div>
      </div>

      <PeriodBar v={period} set={setPeriod} />

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Btn style={{ flex: 1 }} grad={P.mintG} onClick={onIncome}>
          💝 Registra entrata
        </Btn>
        <Btn style={{ flex: 1 }} grad={P.goldG} onClick={onBonus}>
          🎁 Punti Bonus
        </Btn>
      </div>

      <MonthReportCard u={u} />

      <p style={{ color: P.tx, fontSize: 15, fontWeight: 700, margin: "16px 0 10px", letterSpacing: -0.3 }}>💰 Paghetta &amp; Risparmi</p>

      <AdminAllowanceCard u={u} due={due} paid={paid} namesRequired={namesRequired} onPay={onPay} onUndo={onUndoPay} />

      <Suspense fallback={<p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 16 }}>Carico il grafico…</p>}>
        <AdminSavingsCard uid={uid} u={u} />
      </Suspense>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 10px" }}>🏦 Salvadanai</p>
        {FUNDS.map((k) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${P.gb}` }}>
            <div>
              <span style={{ fontSize: 12, color: P.tx }}>{fundName(u, k)}</span>
              <p style={{ fontSize: 10, color: P.tx3, margin: 0 }}>{u.wN[k]}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: P.mint, fontWeight: 700, fontSize: 14 }}>€{u.w[k].toFixed(2)}</span>
              {k === "risparmio" && <p style={{ fontSize: 9, color: P.gold, margin: 0 }}>📈 rend. +€{((u.w[k] * YIELD_YEAR * months) / 12).toFixed(2)}</p>}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span style={{ color: P.tx, fontWeight: 700 }}>Totale</span>
          <span style={{ color: P.gold, fontWeight: 800, fontSize: 16 }}>€{total.toFixed(2)}</span>
        </div>
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>📋 In attesa</p>
        {pending.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 10 }}>Tutto approvato 🎉</p>
        ) : (
          pending.map((l) => {
            const a = acts.find((x) => x.id === l.actId);
            if (!a) return null;
            return (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${P.gb}` }}>
                <div>
                  <span style={{ fontSize: 12, color: P.tx }}>
                    {a.name} ×{l.cnt}
                  </span>
                  <p style={{ color: P.tx3, fontSize: 10, margin: 0 }}>
                    {TODS.find((t) => t.k === l.tod)?.l} {l.note && `· ${l.note}`}
                  </p>
                  <span style={{ fontSize: 11, color: P.mint }}>+{l.pts}pt</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <Btn small grad={P.mintG} onClick={() => onApprove(uid, l.id)}>
                    ✓
                  </Btn>
                  <Btn small color={P.red} onClick={() => onReject(uid, l.id)}>
                    ✗
                  </Btn>
                </div>
              </div>
            );
          })
        )}
      </GlassCard>

      <AdminLogHistory u={u} acts={acts} onRevoke={onRevoke} onDelete={onDeleteLog} onDeduct={onDeduct} />

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>📥 Entrate recenti</p>
        {income.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10, margin: 0 }}>Nessuna entrata registrata</p>
        ) : (
          income.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${P.gb}` }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: P.tx, fontSize: 11 }}>
                  {i.type === "regalo" ? i.source : `${i.type === "paghetta" ? "🟢" : "💝"} ${i.source}`}
                </span>
                <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                  {i.date}
                  {i.type === "regalo" ? ` · 100% ${fundName(u, "personale")}` : i.type === "extra" ? " · extra" : " · paghetta"}
                  {i.confirmed === false ? " · ⏳ non confermata" : ""}
                </p>
              </div>
              <span style={{ color: i.type === "regalo" ? P.gold : P.mint, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>+€{i.amount.toFixed(2)}</span>
            </div>
          ))
        )}
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>💸 Spese recenti</p>
        {u.spese.slice(0, 5).map((s) => (
          <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
            <span style={{ color: P.tx }}>
              {s.d} · {s.ds}
            </span>
            <span style={{ color: P.red }}>-€{s.a.toFixed(2)}</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}

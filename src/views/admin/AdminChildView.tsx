import { Suspense, lazy, useState } from "react";
import MovementFilters from "../../components/MovementFilters";
import MovementSummary from "../../components/MovementSummary";
import TierBar from "../../components/TierBar";
import { FUNDS, PERIOD_MONTHS, TODS, YIELD_YEAR, fundName, getLvl, getTier } from "../../data/constants";
import type { Activity, Fund, LogEntry, Payment, Period, UserId, Users } from "../../data/types";
import { Avatar, Btn, GlassCard, PeriodBar } from "../../design/components";
import { P, alpha } from "../../design/tokens";
import type { MovementFilter } from "../../data/movements";
import { emptyFilter, filterMovements, incomeIcon, isFiltered, summarize } from "../../data/movements";
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
  dueFor,
  paidFor,
  onPay,
  onUndoPay,
  onApprove,
  onReject,
  onRevoke,
  onDeleteLog,
  onDeduct,
  onPenalty,
  onIncome,
  onBonus,
  onPiggyAction,
  namesRequired,
}: {
  uid: UserId;
  users: Users;
  acts: Activity[];
  todayPts: number;
  weekPts: number;
  period: Period;
  setPeriod: (p: Period) => void;
  /** Anteprima dell'accredito di una settimana, dal lunedì ISO che la identifica. */
  dueFor: (week: string) => { pts: number; amount: number; split: Record<Fund, number> };
  /** Accredito già registrato per quella settimana, se c'è. */
  paidFor: (week: string) => Payment | undefined;
  onPay: (week: string) => void;
  onUndoPay: (week: string) => void;
  onApprove: (uid: UserId, logId: number) => void;
  onReject: (uid: UserId, logId: number) => void;
  onRevoke: (l: LogEntry, name: string) => void;
  onDeleteLog: (l: LogEntry, name: string) => void;
  onDeduct: () => void;
  /** Apre il modale della penalità legata a un'attività. */
  onPenalty: () => void;
  onIncome: () => void;
  onBonus: () => void;
  /** Riscatto o azzeramento di un salvadanaio: la conferma vive nello Shell. */
  onPiggyAction: (mode: "redeem" | "reset", fund: Fund) => void;
  /** Falso finché il database non ha la colonna dei nomi dei salvadanai. */
  namesRequired: boolean;
}) {
  const [filter, setFilter] = useState<MovementFilter>(emptyFilter);
  const u = users[uid];
  const lvl = getLvl(u.totalPts);
  const tier = getTier(weekPts);
  const months = PERIOD_MONTHS[period];
  const pending = u.log.filter((l) => !l.ok && !l.revoked);
  const total = FUNDS.reduce((s, k) => s + u.w[k], 0);
  const moves = filterMovements(u, filter);
  const summary = summarize(moves);
  const filtered = isFiltered(filter);

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

      <GlassCard style={{ padding: "14px 14px 10px" }}>
        <TierBar wp={weekPts} color={u.c} grad={u.grad} />
      </GlassCard>

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

      <AdminAllowanceCard u={u} dueFor={dueFor} paidFor={paidFor} namesRequired={namesRequired} onPay={onPay} onUndo={onUndoPay} />

      <Suspense fallback={<p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 16 }}>Carico il grafico…</p>}>
        <AdminSavingsCard uid={uid} u={u} />
      </Suspense>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 10px" }}>🏦 Salvadanai</p>
        {FUNDS.map((k) => (
          <div key={k} style={{ padding: "7px 0", borderBottom: `1px solid ${P.gb}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: 12, color: P.tx }}>{fundName(u, k)}</span>
                <p style={{ fontSize: 10, color: P.tx3, margin: 0 }}>{u.wN[k]}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ color: P.mint, fontWeight: 700, fontSize: 14 }}>€{u.w[k].toFixed(2)}</span>
                {k === "risparmio" && <p style={{ fontSize: 9, color: P.gold, margin: 0 }}>📈 rend. +€{((u.w[k] * YIELD_YEAR * months) / 12).toFixed(2)}</p>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
              <Btn small outline color={P.gold} disabled={u.w[k] <= 0} onClick={() => onPiggyAction("redeem", k)}>
                💸 Riscatta
              </Btn>
              <Btn small outline color={P.red} disabled={u.w[k] <= 0} onClick={() => onPiggyAction("reset", k)}>
                🔄 Azzera
              </Btn>
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

      <Btn full color={P.red} style={{ marginTop: 4 }} onClick={onPenalty}>
        ⚠️ Addebita penalità a {u.n}
      </Btn>
      <p style={{ color: P.tx3, fontSize: 9, textAlign: "center", margin: "4px 0 10px" }}>
        Scegli l'attività non fatta: toglie i suoi punti di penalità dal totale e dalla settimana.
      </p>

      <AdminLogHistory u={u} acts={acts} onRevoke={onRevoke} onDelete={onDeleteLog} onDeduct={onDeduct} />

      <GlassCard style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>🔎 Filtra movimenti</p>
          <span
            style={{
              background: alpha(filtered ? P.acc : P.tx3, 13),
              color: filtered ? P.acc : P.tx3,
              borderRadius: 8,
              padding: "2px 8px",
              fontSize: 10,
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            {summary.count} moviment{summary.count === 1 ? "o" : "i"}
          </span>
        </div>
        <MovementFilters u={u} value={filter} onChange={setFilter} showConfirmed />
      </GlassCard>

      <MovementSummary u={u} summary={summary} />

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>📥 Entrate</p>
        {moves.income.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10, margin: 0 }}>Nessuna entrata in questo periodo</p>
        ) : (
          moves.income.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${P.gb}` }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: P.tx, fontSize: 11 }}>{i.type === "regalo" ? i.source : `${incomeIcon(i.type)} ${i.source}`}</span>
                <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                  {i.date}
                  {i.type === "regalo" ? ` · 100% ${fundName(u, "personale")}` : i.type === "extra" ? " · extra" : " · paghetta"}
                  {i.type === "paghetta" && (i.confirmed ? " · ✅ confermata" : " · ⏳ non confermata")}
                </p>
              </div>
              <span style={{ color: i.type === "regalo" ? P.gold : P.mint, fontWeight: 700, fontSize: 12, flexShrink: 0 }}>+€{i.amount.toFixed(2)}</span>
            </div>
          ))
        )}
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>💸 Spese</p>
        {moves.spese.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10, margin: 0 }}>Nessuna spesa in questo periodo</p>
        ) : (
          moves.spese.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
              <span style={{ color: P.tx }}>
                {s.d} · {s.ds}
              </span>
              <span style={{ color: P.red }}>
                -€{s.a.toFixed(2)} <span style={{ color: P.tx3 }}>({fundName(u, s.f)})</span>
              </span>
            </div>
          ))
        )}
      </GlassCard>
    </div>
  );
}

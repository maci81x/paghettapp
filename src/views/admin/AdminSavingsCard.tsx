import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { YIELD_YEAR } from "../../data/constants";
import type { User, UserId } from "../../data/types";
import { GlassCard, InfoTip } from "../../design/components";
import { P, gls } from "../../design/tokens";
import { useSavingsHistory } from "../../hooks/useSavingsHistory";
import { weeklyGrowth, yearlyGrowth } from "../../utils/compoundInterest";

/** Andamento del salvadanaio Risparmio negli ultimi 3 mesi, vista admin. */
export default function AdminSavingsCard({ uid, u }: { uid: UserId; u: User }) {
  const { series, summary } = useSavingsHistory(uid, u);
  const perWeek = weeklyGrowth(summary.current, YIELD_YEAR);
  const perYear = yearlyGrowth(summary.current, YIELD_YEAR);
  const goalPct = Math.min(100, (summary.current / summary.goal) * 100);

  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>
          📈 Andamento Risparmi
          <InfoTip text="Saldo ricostruito dai versamenti e dai prelievi degli ultimi 3 mesi. Il rendimento è una stima all'interesse composto." />
        </p>
        <span style={{ color: P.mint, fontWeight: 800, fontSize: 18 }}>€{summary.current.toFixed(2)}</span>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={series} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={P.gb} />
          <XAxis dataKey="d" tick={{ fill: P.tx3, fontSize: 8 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: P.tx3, fontSize: 8 }} />
          <Tooltip
            contentStyle={{ ...gls, background: P.surf, fontSize: 10, borderRadius: 10 }}
            formatter={(v) => [`€${Number(v).toFixed(2)}`, "Saldo"]}
          />
          <Line type="monotone" dataKey="saldo" stroke={P.mint} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "8px 0" }}>
        <div style={{ ...gls, padding: 8, borderRadius: 10 }}>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>REND. SETTIMANALE</p>
          <p style={{ color: P.mint, fontSize: 14, fontWeight: 800, margin: 0 }}>+€{perWeek.toFixed(2)}</p>
        </div>
        <div style={{ ...gls, padding: 8, borderRadius: 10 }}>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>REND. ANNUO ({YIELD_YEAR * 100}%)</p>
          <p style={{ color: P.gold, fontSize: 14, fontWeight: 800, margin: 0 }}>+€{perYear.toFixed(2)}</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
        <span style={{ color: P.tx2 }}>📦 Totale versato</span>
        <span style={{ color: P.tx, fontWeight: 700 }}>€{summary.contributed.toFixed(2)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
        <span style={{ color: P.tx2 }}>💰 Saldo attuale</span>
        <span style={{ color: P.mint, fontWeight: 700 }}>€{summary.current.toFixed(2)}</span>
      </div>
      {summary.withdrawn > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
          <span style={{ color: P.tx2 }}>💸 Prelevato</span>
          <span style={{ color: P.red, fontWeight: 700 }}>-€{summary.withdrawn.toFixed(2)}</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11 }}>
        <span style={{ color: P.tx2 }}>📈 Differenza</span>
        <span style={{ color: summary.growth >= 0 ? P.mint : P.red, fontWeight: 700 }}>
          {summary.growth >= 0 ? "+" : "−"}€{Math.abs(summary.growth).toFixed(2)}
        </span>
      </div>

      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${P.gb}` }}>
        <div style={{ background: P.glass, borderRadius: 3, height: 5 }}>
          <div style={{ background: P.mintG, borderRadius: 3, height: 5, width: `${goalPct}%`, transition: "width .6s" }} />
        </div>
        <p style={{ color: P.tx3, fontSize: 10, margin: "4px 0 0" }}>
          🎯 Mancano <b style={{ color: P.gold }}>€{summary.toGoal.toFixed(2)}</b> per arrivare a €{summary.goal}
        </p>
      </div>
    </GlassCard>
  );
}

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TREND_MESSAGE } from "../../data/savings";
import type { User, UserId } from "../../data/types";
import { GlassCard } from "../../design/components";
import { P, gls } from "../../design/tokens";
import { useSavingsHistory } from "../../hooks/useSavingsHistory";

const TREND_COLOR = { up: P.mint, flat: P.gold, down: P.blue } as const;

/** "Il tuo andamento": quanto è cresciuto il risparmio, spiegato alle ragazze. */
export default function SavingsTrendCard({ uid, u, color }: { uid: UserId; u: User; color: string }) {
  const { series, summary } = useSavingsHistory(uid, u);
  const tint = TREND_COLOR[summary.trend];

  return (
    <GlassCard>
      <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>📊 Il tuo andamento</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div style={{ ...gls, padding: 8, borderRadius: 10, textAlign: "center" }}>
          <p style={{ color: P.tx3, fontSize: 8, margin: 0 }}>SALDO</p>
          <p style={{ color: P.mint, fontSize: 14, fontWeight: 800, margin: 0 }}>€{summary.current.toFixed(2)}</p>
        </div>
        <div style={{ ...gls, padding: 8, borderRadius: 10, textAlign: "center" }}>
          <p style={{ color: P.tx3, fontSize: 8, margin: 0 }}>VERSATO</p>
          <p style={{ color: P.tx, fontSize: 14, fontWeight: 800, margin: 0 }}>€{summary.contributed.toFixed(2)}</p>
        </div>
        <div style={{ ...gls, padding: 8, borderRadius: 10, textAlign: "center" }}>
          <p style={{ color: P.tx3, fontSize: 8, margin: 0 }}>INTERESSI</p>
          <p style={{ color: summary.growth >= 0 ? P.gold : P.red, fontSize: 14, fontWeight: 800, margin: 0 }}>
            {summary.growth >= 0 ? "+" : "−"}€{Math.abs(summary.growth).toFixed(2)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={series} margin={{ top: 8, right: 6, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={P.gb} />
          <XAxis dataKey="d" tick={{ fill: P.tx3, fontSize: 8 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: P.tx3, fontSize: 8 }} />
          <Tooltip
            contentStyle={{ ...gls, background: P.surf, fontSize: 10, borderRadius: 10 }}
            formatter={(v) => [`€${Number(v).toFixed(2)}`, "Saldo"]}
          />
          <Line type="monotone" dataKey="saldo" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>

      <p style={{ color: tint, fontSize: 11, margin: "6px 0 0", lineHeight: 1.5, fontWeight: 600 }}>{TREND_MESSAGE[summary.trend]}</p>
    </GlassCard>
  );
}

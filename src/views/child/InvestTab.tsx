import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SPLIT, YIELD_YEAR, fundName } from "../../data/constants";
import { monthlyAllowanceAvg } from "../../data/report";
import type { InvestCfg, User, UserId } from "../../data/types";
import { GlassCard, InfoTip, Input, Label, Pill, SectionTitle } from "../../design/components";
import { P, alpha, gls } from "../../design/tokens";
import { calcCompoundInterest } from "../../utils/compoundInterest";
import SavingsTrendCard from "./SavingsTrendCard";

const MIN_MONTHS = 12;
const MAX_MONTHS = 120;

export default function InvestTab({ uid, u, uc, onChange }: { uid: UserId; u: User; uc: string; onChange: (k: keyof InvestCfg, v: number) => void }) {
  // il capitale simulato è il salvadanaio vero: le ragazze non lo modificano
  const principal = u.w.risparmio;
  const months = Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, u.inv.mo));
  const monthlyAdd = Math.max(0, u.inv.ex);
  // suggerimento: 30% della paghetta media degli ultimi 3 mesi
  const suggested = +(monthlyAllowanceAvg(u, 3) * SPLIT.risparmio).toFixed(2);

  const res = calcCompoundInterest(principal, monthlyAdd, YIELD_YEAR, months);
  /**
   * Quanto rendono in tutto i soldi versati, non il tasso annuo: i versamenti
   * dei mesi finali lavorano per poche settimane, quindi su un anno questa
   * percentuale sta ben sotto al 10%. Sono due numeri diversi e vanno detti
   * come due numeri diversi, altrimenti si legge il 10% come sbagliato.
   */
  const growthPct = res.totalContributed > 0 ? Math.round((res.totalGrowth / res.totalContributed) * 100) : 0;
  // con orizzonti lunghi il grafico mostra un punto ogni N mesi, altrimenti diventa illeggibile
  const step = Math.ceil(res.monthlyBreakdown.length / 24) || 1;
  const chart = res.monthlyBreakdown
    .filter((_, i) => (i + 1) % step === 0 || i === res.monthlyBreakdown.length - 1)
    .map((m) => ({ m: `M${m.month}`, versato: m.contributed, interessi: m.growth }));

  return (
    <div>
      <SectionTitle>
        📈 I miei risparmi <InfoTip text={`Interesse composto al ${YIELD_YEAR * 100}%/anno, capitalizzato ogni mese. Blocco minimo 1 anno.`} />
      </SectionTitle>

      <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.mint, 3)},transparent)`, border: `1px solid ${alpha(P.mint, 10)}` }}>
        <p style={{ color: P.tx2, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
          👨‍👧 Babbo Roby investe i tuoi risparmi. Più li lasci, più crescono grazie all'interesse composto: i guadagni generano altri guadagni!
        </p>
      </GlassCard>

      <SavingsTrendCard uid={uid} u={u} color={uc} />

      <GlassCard>
        <Label>Quanto hai in {fundName(u, "risparmio")} adesso</Label>
        <div style={{ ...gls, padding: 9, borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: P.mint, fontSize: 16, fontWeight: 800 }}>€{principal.toFixed(2)}</span>
          <span style={{ color: P.tx3, fontSize: 9 }}>gestito da Babbo Roby</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <Label>Quanto aggiungi ogni mese €</Label>
            <Input type="number" value={u.inv.ex} onChange={(e) => onChange("ex", +e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <Label>Per quanti mesi ({MIN_MONTHS}–{MAX_MONTHS})</Label>
            <Input type="number" min={MIN_MONTHS} max={MAX_MONTHS} value={u.inv.mo} onChange={(e) => onChange("mo", Math.min(MAX_MONTHS, +e.target.value))} />
          </div>
        </div>
        <input
          type="range"
          min={MIN_MONTHS}
          max={MAX_MONTHS}
          step={6}
          value={months}
          onChange={(e) => onChange("mo", +e.target.value)}
          style={{ width: "100%", accentColor: P.mint, marginBottom: 6 }}
        />
        {suggested > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: P.tx3 }}>Consigliato: €{suggested.toFixed(2)}/mese (30% della paghetta media)</span>
            <Pill color={P.mint} active onClick={() => onChange("ex", suggested)} s>
              usa
            </Pill>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${P.gb}`, paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <p style={{ color: P.tx, fontSize: 13, fontWeight: 700, margin: 0 }}>
              💰 Tra {months} mesi avrai: <span style={{ color: P.gold, fontSize: 16 }}>€{res.finalValue.toFixed(2)}</span>
            </p>
            <span style={{ background: alpha(P.gold, 13), color: P.gold, borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 800, flexShrink: 0, whiteSpace: "nowrap" }}>
              tasso {YIELD_YEAR * 100}%/anno
            </span>
          </div>
          <p style={{ color: P.tx2, fontSize: 11, margin: "0 0 3px" }}>
            📦 Di cui versato da te: <b style={{ color: P.acc }}>€{res.totalContributed.toFixed(2)}</b>
          </p>
          <p style={{ color: P.tx2, fontSize: 11, margin: 0 }}>
            📈 Di cui guadagnato con gli interessi: <b style={{ color: P.mint }}>€{res.totalGrowth.toFixed(2)}</b>
          </p>
          <p style={{ color: P.tx3, fontSize: 10, margin: "5px 0 0", lineHeight: 1.45 }}>
            Sono <b style={{ color: P.mint }}>+{growthPct}%</b> su tutto quello che hai versato in {months} mesi — un altro numero rispetto al tasso.
            {monthlyAdd > 0 && " I soldi che aggiungi negli ultimi mesi lavorano poco tempo, quindi il totale cresce meno del 10% all'anno."}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={chart} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.gb} />
            <XAxis dataKey="m" tick={{ fill: P.tx3, fontSize: 8 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: P.tx3, fontSize: 8 }} />
            <Tooltip
              contentStyle={{ ...gls, background: P.surf, fontSize: 10, borderRadius: 10 }}
              formatter={(v) => `€${Number(v).toFixed(2)}`}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Bar dataKey="versato" name="Versato" stackId="a" fill={P.mint} />
            <Bar dataKey="interessi" name="Interessi" stackId="a" fill={P.gold} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}

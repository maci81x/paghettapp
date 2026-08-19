import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SPLIT, YIELD_YEAR, mkInv } from "../../data/constants";
import { weeklyAvg } from "../../data/report";
import type { InvestCfg, User } from "../../data/types";
import { GlassCard, InfoTip, Input, Label, Pill, SectionTitle } from "../../design/components";
import { P, gls } from "../../design/tokens";

export default function InvestTab({ u, onChange }: { u: User; onChange: (k: keyof InvestCfg, v: number) => void }) {
  // il capitale simulato è il salvadanaio vero: le ragazze non lo modificano
  const amt = u.w.risparmio;
  const months = Math.max(u.inv.mo, 12);
  // suggerimento: 30% di quanto entra in media ogni mese
  const suggested = +(((weeklyAvg(u) * 52) / 12) * SPLIT.risparmio).toFixed(2);

  const data = mkInv(amt, months, u.inv.ex);
  const last = data[data.length - 1] || { investito: 0, guadagno: 0, totale: 0 };
  const rows = [
    { l: "Versato", v: last.investito, c: P.acc, g: P.accG },
    { l: "Guadagno", v: last.guadagno, c: P.mint, g: P.mintG },
    { l: "Totale", v: last.totale, c: P.gold, g: P.goldG },
  ];

  return (
    <div>
      <SectionTitle>
        📈 I miei risparmi <InfoTip text={`Simulazione: rendimento medio storico ~${YIELD_YEAR * 100}%/anno (S&P 500). Blocco minimo 1 anno.`} />
      </SectionTitle>

      <GlassCard style={{ background: `linear-gradient(135deg,${P.mint}08,transparent)`, border: `1px solid ${P.mint}1a` }}>
        <p style={{ color: P.tx2, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
          👨‍👧 Babbo Roby investe i tuoi risparmi nel mercato. Tu puoi monitorare come crescono!
        </p>
      </GlassCard>

      <GlassCard>
        <Label>Quanto hai nel risparmio adesso</Label>
        <div style={{ ...gls, padding: 9, borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: P.mint, fontSize: 16, fontWeight: 800 }}>€{amt.toFixed(2)}</span>
          <span style={{ color: P.tx3, fontSize: 9 }}>gestito da Babbo Roby</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <div style={{ flex: 1 }}>
            <Label>Quanto aggiungi ogni mese €</Label>
            <Input type="number" value={u.inv.ex} onChange={(e) => onChange("ex", +e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <Label>Per quanti mesi vuoi lasciarlo</Label>
            <Input type="number" value={u.inv.mo} onChange={(e) => onChange("mo", +e.target.value)} />
          </div>
        </div>
        {suggested > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 9, color: P.tx3 }}>Consigliato: €{suggested.toFixed(2)}/mese (30% di quanto guadagni)</span>
            <Pill color={P.mint} active onClick={() => onChange("ex", suggested)} s>
              usa
            </Pill>
          </div>
        )}

        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.gb} />
            <XAxis dataKey="m" tick={{ fill: P.tx3, fontSize: 8 }} />
            <YAxis tick={{ fill: P.tx3, fontSize: 8 }} />
            <Tooltip
              contentStyle={{ ...gls, background: "rgba(15,15,30,.95)", fontSize: 10, borderRadius: 10 }}
              formatter={(v) => `€${Number(v).toFixed(2)}`}
            />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Area type="monotone" dataKey="investito" name="Versato" stackId="1" stroke={P.acc} fill={P.acc + "33"} />
            <Area type="monotone" dataKey="guadagno" name="Guadagno" stackId="1" stroke={P.mint} fill={P.mint + "33"} />
            <Line type="monotone" dataKey="totale" name="Totale" stroke={P.gold} strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>

        <p style={{ color: P.tx, fontSize: 12, fontWeight: 700, textAlign: "center", margin: "8px 0 0" }}>
          Tra {months} mesi avrai <span style={{ color: P.gold }}>€{last.totale.toFixed(2)}</span>{" "}
          <span style={{ color: P.mint }}>(+€{last.guadagno.toFixed(2)} di guadagno!)</span>
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginTop: 10 }}>
          {rows.map((r) => (
            <div key={r.l} style={{ textAlign: "center", ...gls, padding: 8, borderRadius: 10, background: `linear-gradient(135deg,${r.c}08,transparent)` }}>
              <p style={{ fontSize: 9, color: P.tx2, margin: 0 }}>{r.l}</p>
              <p style={{ fontSize: 15, fontWeight: 800, margin: "2px 0", background: r.g, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                €{r.v.toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

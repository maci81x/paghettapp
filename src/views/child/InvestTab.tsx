import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MONTH_RATE } from "../../data/interest";
import { SPLIT, YIELD_YEAR, fundName } from "../../data/constants";
import { monthlyAllowanceAvg } from "../../data/report";
import type { InvestCfg, User, UserId } from "../../data/types";
import { GlassCard, InfoTip, Label, Pill, SectionTitle } from "../../design/components";
import { P, alpha, gls } from "../../design/tokens";
import { calcCompoundInterest } from "../../utils/compoundInterest";
import { useInterest } from "../../hooks/useInterest";
import InterestCard from "./InterestCard";
import SavingsTrendCard from "./SavingsTrendCard";
import { fmtEuro } from "../../utils/money";

const MIN_MONTHS = 12;
const MAX_MONTHS = 120;
/** Durate proposte per il blocco: minimo un anno. */
const LOCK_YEARS = [1, 2, 3, 5, 10];
/** Tetto del versamento mensile simulato. */
const MAX_EXTRA = 20;

export default function InvestTab({
  uid,
  u,
  uc,
  interestSupported,
  onChange,
}: {
  uid: UserId;
  u: User;
  uc: string;
  /** Falso finché manca la tabella `interest_log`: restano solo le stime. */
  interestSupported: boolean;
  onChange: (k: keyof InvestCfg, v: number) => void;
}) {
  const interest = useInterest(uid, u.w.risparmio);
  // il capitale simulato è il salvadanaio vero: le ragazze non lo modificano
  const principal = u.w.risparmio;
  const months = Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, u.inv.mo));
  const monthlyAdd = Math.min(MAX_EXTRA, Math.max(0, u.inv.ex));
  // suggerimento: 30% della paghetta media degli ultimi 3 mesi
  const suggested = +(monthlyAllowanceAvg(u, 3) * SPLIT.risparmio).toFixed(2);

  // stesso tasso mensile degli interessi accreditati davvero: la stima non promette di più
  const res = calcCompoundInterest(principal, monthlyAdd, MONTH_RATE * 12, months);
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
    .map((m) => ({
      m: m.month % 12 === 0 ? `${m.month / 12}a` : `${m.month}m`,
      investito: m.contributed,
      guadagno: m.growth,
      totale: m.balance,
    }));

  return (
    <div>
      <SectionTitle>
        📈 I miei risparmi <InfoTip text={`Interesse composto al ${YIELD_YEAR * 100}%/anno, capitalizzato ogni mese. Blocco minimo 1 anno.`} />
      </SectionTitle>

      <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.mint, 3)},transparent)`, border: `1px solid ${alpha(P.mint, 10)}` }}>
        <p style={{ color: P.tx2, fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
          👨‍👧 Babbo Roby investe i tuoi risparmi. Più li lasci, più crescono grazie all'interesse composto: i guadagni generano altri guadagni!
        </p>
      </GlassCard>

      <SavingsTrendCard uid={uid} u={u} color={uc} />

      <InterestCard view={interest} supported={interestSupported} />

      <GlassCard>
        <Label>Quanto hai in {fundName(u, "risparmio")} adesso</Label>
        <div style={{ ...gls, padding: 9, borderRadius: 10, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: P.mint, fontSize: 16, fontWeight: 800 }}>{fmtEuro(principal)}</span>
          <span style={{ color: P.tx3, fontSize: 11.5 }}>gestito da Babbo Roby</span>
        </div>

        <Label>🔒 Blocca per</Label>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          {LOCK_YEARS.map((y) => (
            <Pill key={y} active={months === y * 12} onClick={() => onChange("mo", y * 12)} color={P.mint}>
              {y}a
            </Pill>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Label>➕ Extra al mese</Label>
          <span style={{ color: P.acc, fontSize: 13, fontWeight: 800 }}>{fmtEuro(monthlyAdd)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={MAX_EXTRA}
          step={0.5}
          value={monthlyAdd}
          aria-label="Extra al mese"
          onChange={(e) => onChange("ex", +e.target.value)}
          style={{ width: "100%", accentColor: P.acc, marginBottom: 6, minHeight: 32 }}
        />
        {suggested > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, color: P.tx3 }}>Consigliato: {fmtEuro(suggested)}/mese (30% della paghetta media)</span>
            <Pill color={P.mint} active onClick={() => onChange("ex", suggested)} s>
              usa
            </Pill>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${P.gb}`, paddingTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <p style={{ color: P.tx, fontSize: 13, fontWeight: 700, margin: 0 }}>
              💰 Tra {months % 12 === 0 ? `${months / 12} ann${months === 12 ? "o" : "i"}` : `${months} mesi`} avrai: <span style={{ color: P.gold, fontSize: 16 }}>{fmtEuro(res.finalValue)}</span>
            </p>
            <span style={{ background: alpha(P.gold, 13), color: P.gold, borderRadius: 8, padding: "2px 8px", fontSize: 12, fontWeight: 800, flexShrink: 0, whiteSpace: "nowrap" }}>
              tasso {YIELD_YEAR * 100}%/anno
            </span>
          </div>
          <p style={{ color: P.tx2, fontSize: 12.5, margin: "0 0 3px" }}>
            📦 Di cui versato da te: <b style={{ color: P.acc }}>{fmtEuro(res.totalContributed)}</b>
          </p>
          <p style={{ color: P.tx2, fontSize: 12.5, margin: 0 }}>
            📈 Di cui guadagnato con gli interessi: <b style={{ color: P.mint }}>{fmtEuro(res.totalGrowth)}</b>
          </p>
          <p style={{ color: P.tx3, fontSize: 12, margin: "5px 0 0", lineHeight: 1.45 }}>
            Sono <b style={{ color: P.mint }}>+{growthPct}%</b> su tutto quello che hai versato in {months} mesi — un altro numero rispetto al tasso.
            {monthlyAdd > 0 && " I soldi che aggiungi negli ultimi mesi lavorano poco tempo, quindi il totale cresce meno del 10% all'anno."}
          </p>
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chart} margin={{ top: 12, right: 4, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="gainFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={P.mint} stopOpacity={0.45} />
                <stop offset="100%" stopColor={P.mint} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={P.gb} />
            <XAxis dataKey="m" tick={{ fill: P.tx3, fontSize: 8 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: P.tx3, fontSize: 8 }} />
            <Tooltip contentStyle={{ ...gls, background: P.surf, fontSize: 12, borderRadius: 10 }} formatter={(v) => `${fmtEuro(Number(v))}`} />
            <Legend wrapperStyle={{ fontSize: 11.5 }} />
            <Area type="monotone" dataKey="guadagno" name="🟢 Guadagno" stroke={P.mint} fill="url(#gainFill)" strokeWidth={1.5} />
            <Line type="monotone" dataKey="investito" name="🔵 Investito" stroke={P.blue} strokeDasharray="5 4" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="totale" name="🟡 Totale" stroke={P.gold} strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
          {[
            { l: "Investito", v: res.totalContributed, c: P.blue },
            { l: "Guadagno", v: res.totalGrowth, c: P.mint },
            { l: "Totale", v: res.finalValue, c: P.gold },
          ].map((x) => (
            <div key={x.l} style={{ background: alpha(x.c, 12), borderRadius: 12, padding: "6px 4px", textAlign: "center" }}>
              <p style={{ color: P.tx3, fontSize: 11.5, margin: 0 }}>{x.l}</p>
              <p style={{ color: x.c, fontSize: 13, fontWeight: 800, margin: 0 }}>{fmtEuro(x.v)}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FUNDS, FUND_LABEL } from "../../data/constants";
import { allIncome } from "../../data/report";
import type { Period, User } from "../../data/types";
import { Btn, GlassCard, InfoTip, PeriodBar, SectionTitle } from "../../design/components";
import { P, gls } from "../../design/tokens";
import MonthReportCard from "../MonthReportCard";

export default function WalletTab({
  u,
  uc,
  period,
  setPeriod,
  series,
  onNewSpesa,
  onNewIncome,
}: {
  u: User;
  uc: string;
  period: Period;
  setPeriod: (p: Period) => void;
  series: { d: string; pts: number; spese: number }[];
  onNewSpesa: () => void;
  onNewIncome: () => void;
}) {
  const total = FUNDS.reduce((s, k) => s + u.w[k], 0);
  const income = allIncome(u);
  return (
    <div>
      <SectionTitle>
        Wallet <InfoTip text="Traccia entrate e spese." />
      </SectionTitle>
      <PeriodBar v={period} set={setPeriod} />

      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: P.tx2, fontSize: 11 }}>Totale salvadanai</span>
          <span style={{ color: P.gold, fontWeight: 800, fontSize: 18 }}>€{total.toFixed(2)}</span>
        </div>
        {FUNDS.map((k) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
            <span style={{ color: P.tx }}>{FUND_LABEL[k]}</span>
            <span style={{ color: P.mint, fontWeight: 700 }}>€{u.w[k].toFixed(2)}</span>
          </div>
        ))}
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx2, fontSize: 10, margin: "0 0 6px" }}>📊 Punti e spese</p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke={P.gb} />
            <XAxis dataKey="d" tick={{ fill: P.tx3, fontSize: 8 }} />
            <YAxis tick={{ fill: P.tx3, fontSize: 8 }} />
            <Tooltip contentStyle={{ ...gls, background: "rgba(15,15,30,.95)", fontSize: 10, borderRadius: 10 }} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            <Bar dataKey="pts" name="Punti" fill={uc} radius={[5, 5, 0, 0]} />
            <Bar dataKey="spese" name="Spese €" fill={P.red} radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      <MonthReportCard u={u} />

      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>
            📥 Entrate <InfoTip text="Paghette settimanali ed entrate extra: regali, lavoretti, mance." />
          </p>
          <Btn small grad={P.mintG} onClick={onNewIncome}>
            💝 Entrata
          </Btn>
        </div>
        {income.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10 }}>Nessuna entrata registrata</p>
        ) : (
          income.map((i, idx) => {
            const pay = i.type === "paghetta" ? (u.pays ?? []).find((p) => p.id === i.id) : undefined;
            const color = i.type === "paghetta" ? P.mint : P.gold;
            return (
              <div key={i.id} style={{ display: "flex", gap: 8 }}>
                {/* timeline: pallino + filo di collegamento */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: color, marginTop: 8, flexShrink: 0 }} />
                  {idx < income.length - 1 && <span style={{ flex: 1, width: 1, background: P.gb }} />}
                </div>
                <div style={{ flex: 1, display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11 }}>
                  <div>
                    <span style={{ color: P.tx }}>
                      {i.type === "paghetta" ? "🟢" : "💝"} {i.source}
                    </span>
                    <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                      {i.date}
                      {pay ? ` · €${pay.amount.toFixed(2)} (${pay.pts}pt)` : " · extra"}
                    </p>
                  </div>
                  <span style={{ color: P.mint, fontWeight: 700 }}>+€{i.amount.toFixed(2)}</span>
                </div>
              </div>
            );
          })
        )}
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>
          🪙 Paghette ricevute <InfoTip text="Ogni paghetta viene divisa: 30% Risparmio, 60% Personale, 10% Beneficenza." />
        </p>
        {(u.pays ?? []).length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10 }}>Nessuna paghetta accreditata</p>
        ) : (
          (u.pays ?? []).slice(0, 6).map((p) => (
            <div key={p.id} style={{ padding: "5px 0", borderBottom: `1px solid ${P.gb}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ color: P.tx }}>Settimana del {p.week}</span>
                <span style={{ color: P.mint, fontWeight: 700 }}>+€{p.amount.toFixed(2)}</span>
              </div>
              <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                {p.pts}pt · 🏦 €{p.split.risparmio.toFixed(2)} · 🎒 €{p.split.personale.toFixed(2)} · 🤝 €{p.split.beneficenza.toFixed(2)}
              </p>
            </div>
          ))
        )}
      </GlassCard>

      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>💸 Spese</p>
          <Btn small grad={P.goldG} onClick={onNewSpesa}>
            + Spesa
          </Btn>
        </div>
        {u.spese.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10 }}>Nessuna spesa registrata</p>
        ) : (
          u.spese.map((s) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
              <span style={{ color: P.tx }}>
                {s.d} · {s.ds}
              </span>
              <span style={{ color: P.red }}>
                -€{s.a.toFixed(2)} <span style={{ color: P.tx3 }}>({s.f})</span>
              </span>
            </div>
          ))
        )}
      </GlassCard>
    </div>
  );
}

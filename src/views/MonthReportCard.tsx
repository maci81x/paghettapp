import { FUNDS, FUND_LABEL } from "../data/constants";
import { monthReport, trendPct } from "../data/report";
import type { User } from "../data/types";
import { GlassCard } from "../design/components";
import { P } from "../design/tokens";

const FUND_COLOR = { risparmio: P.mint, personale: P.blue, beneficenza: P.gold } as const;

/** Report del mese: guadagnato, speso, saldo netto e distribuzione sui salvadanai. */
export default function MonthReportCard({ u, title = "📊 Report del mese" }: { u: User; title?: string }) {
  const now = monthReport(u, 0);
  const prev = monthReport(u, 1);
  const trend = trendPct(now.earned, prev.earned);
  const maxFund = Math.max(...FUNDS.map((k) => now.byFund[k]), 0.01);

  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>{title}</p>
        {trend !== null && (
          <span style={{ color: trend >= 0 ? P.mint : P.red, fontSize: 10, fontWeight: 700 }}>
            {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% vs mese scorso
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>Guadagnato</p>
          <p style={{ color: P.mint, fontSize: 15, fontWeight: 800, margin: 0 }}>€{now.earned.toFixed(2)}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>Speso</p>
          <p style={{ color: P.red, fontSize: 15, fontWeight: 800, margin: 0 }}>€{now.spent.toFixed(2)}</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>Saldo</p>
          <p style={{ color: now.net >= 0 ? P.gold : P.red, fontSize: 15, fontWeight: 800, margin: 0 }}>€{now.net.toFixed(2)}</p>
        </div>
      </div>

      {FUNDS.map((k) => (
        <div key={k} style={{ marginBottom: 5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
            <span style={{ color: P.tx2 }}>{FUND_LABEL[k]}</span>
            <span style={{ color: FUND_COLOR[k], fontWeight: 700 }}>€{now.byFund[k].toFixed(2)}</span>
          </div>
          <div style={{ background: P.track, borderRadius: 3, height: 5, marginTop: 2 }}>
            <div style={{ background: FUND_COLOR[k], borderRadius: 3, height: 5, width: `${(now.byFund[k] / maxFund) * 100}%`, transition: "width .5s" }} />
          </div>
        </div>
      ))}

      {now.earned === 0 && now.spent === 0 && <p style={{ color: P.tx3, fontSize: 10, margin: "6px 0 0" }}>Nessun movimento questo mese.</p>}
    </GlassCard>
  );
}

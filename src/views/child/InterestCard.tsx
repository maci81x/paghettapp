import { MONTH_RATE, periodLabel } from "../../data/interest";
import { YIELD_YEAR } from "../../data/constants";
import type { InterestView } from "../../hooks/useInterest";
import { GlassCard } from "../../design/components";
import { P, alpha } from "../../design/tokens";

const pct = (amount: number, before: number) => (before > 0 ? `+${((amount / before) * 100).toFixed(2)}%` : `+${(MONTH_RATE * 100).toFixed(2)}%`);

/** Gli interessi già incassati, mese per mese: non una simulazione. */
export default function InterestCard({ view, supported }: { view: InterestView; supported: boolean }) {
  const recent = view.history.slice(0, 6);

  return (
    <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.mint, 5)},transparent)`, border: `1px solid ${alpha(P.mint, 14)}` }}>
      <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>💰 I tuoi interessi</p>

      <div style={{ background: alpha(P.mint, 8), borderRadius: 10, padding: 10, marginBottom: 10 }}>
        {view.thisMonth ? (
          <p style={{ color: P.tx, fontSize: 13, fontWeight: 800, margin: 0 }}>
            📈 Questo mese hai guadagnato: <span style={{ color: P.mint }}>+€{view.thisMonth.amount.toFixed(2)}</span> di interessi!
          </p>
        ) : (
          <p style={{ color: P.tx, fontSize: 13, fontWeight: 800, margin: 0 }}>
            📈 A fine mese guadagnerai circa <span style={{ color: P.mint }}>+€{view.projected.toFixed(2)}</span>
          </p>
        )}
        {view.total > 0 && (
          <p style={{ color: P.tx3, fontSize: 10, margin: "3px 0 0" }}>In tutto hai già incassato €{view.total.toFixed(2)} di interessi.</p>
        )}
      </div>

      {!supported ? (
        <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 8, margin: 0 }}>
          Gli interessi non sono ancora attivi: per ora quello che vedi è una stima.
        </p>
      ) : recent.length === 0 ? (
        <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 8, margin: 0 }}>
          I tuoi interessi verranno calcolati alla fine del primo mese
        </p>
      ) : (
        recent.map((h) => (
          <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${P.gb}` }}>
            <div>
              <p style={{ color: P.tx, fontSize: 12, fontWeight: 600, margin: 0 }}>{periodLabel(h.period)}</p>
              <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>Saldo di partenza €{h.balanceBefore.toFixed(2)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: h.amount > 0 ? P.mint : P.tx3, fontSize: 13, fontWeight: 800, margin: 0 }}>+€{h.amount.toFixed(2)}</p>
              <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>({pct(h.amount, h.balanceBefore)})</p>
            </div>
          </div>
        ))
      )}

      <p style={{ color: P.tx2, fontSize: 10, margin: "10px 0 0", lineHeight: 1.5 }}>
        💡 Ogni mese, il {YIELD_YEAR * 100}% annuo viene calcolato sul tuo saldo e aggiunto automaticamente. Più lasci i soldi, più crescono — perché gli
        interessi generano altri interessi!
      </p>
    </GlassCard>
  );
}

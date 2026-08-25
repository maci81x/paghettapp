import { actIcon } from "../../data/constants";
import type { Activity, LogEntry } from "../../data/types";
import { GlassCard } from "../../design/components";
import { P, alpha } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

/**
 * Penalità ricevute: in rosso e con un testo esplicito, così non si confondono
 * con le attività completate.
 */
export default function PenaltyCard({ penalties, acts }: { penalties: LogEntry[]; acts: Activity[] }) {
  if (penalties.length === 0) return null;
  return (
    <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.red, 8)},transparent)`, border: `1px solid ${alpha(P.red, 22)}` }}>
      <p style={{ color: P.red, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>⚠️ Penalità ricevute</p>
      {penalties.map((l) => {
        const a = acts.find((x) => x.id === l.actId);
        return (
          <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, padding: "4px 0" }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ color: P.tx2, fontSize: 11, margin: 0 }}>
                ⚠️ Penalità: non hai fatto {a ? `${actIcon(a)} ${a.name}` : "un'attività"}
              </p>
              <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                {fmtDay(l.date)}
                {l.note && ` · ${l.note}`}
              </p>
            </div>
            <span style={{ color: P.red, fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{l.pts}pt</span>
          </div>
        );
      })}
    </GlassCard>
  );
}

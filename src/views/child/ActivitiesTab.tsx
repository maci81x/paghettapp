import { useState } from "react";
import type { ComponentProps } from "react";
import { CATS, FREQ_UNIT, PERIOD_WORD, TODS, actIcon } from "../../data/constants";
import type { Activity, Tod } from "../../data/types";
import { Btn, GlassCard, InfoTip, Pill } from "../../design/components";
import { P, alpha } from "../../design/tokens";
import PendingApprovalCard from "./PendingApprovalCard";

type PtsFilter = "all" | "low" | "mid" | "high";

const FREQ_SHORT: Record<string, string> = { daily: "giorn.", weekly: "sett.", monthly: "mens." };
const PTS_FILTERS: { k: PtsFilter; l: string }[] = [
  { k: "all", l: "Tutti" },
  { k: "low", l: "≤5pt" },
  { k: "mid", l: "5-10" },
  { k: "high", l: "≥10" },
];

export default function ActivitiesTab({
  pending,
  acts,
  grad,
  tp,
  todayDone,
  periodDone,
  todayByTod,
  onMark,
}: {
  /** Card "In attesa di approvazione": condivisa con l'altra scheda. */
  pending: ComponentProps<typeof PendingApprovalCard>;
  acts: Activity[];
  grad: string;
  tp: number;
  todayDone: (actId: number) => number;
  /** Completamenti nel periodo dell'attività: è questo che consuma il limite. */
  periodDone: (a: Activity) => number;
  todayByTod: (actId: number) => Record<Tod, number>;
  onMark: (a: Activity, remaining: number) => void;
}) {
  const [cat, setCat] = useState<string>("all");
  const [pts, setPts] = useState<PtsFilter>("all");

  const filtered = acts.filter((a) => {
    if (cat !== "all" && a.cat !== cat) return false;
    if (pts === "low" && a.pts > 5) return false;
    if (pts === "mid" && (a.pts < 5 || a.pts > 10)) return false;
    if (pts === "high" && a.pts < 10) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: P.tx, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Attività</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: P.tx3 }}>
            Oggi: <b style={{ color: P.mint }}>+{tp}pt</b>
          </span>
          <InfoTip text="Segna le attività completate. Indica quante volte e quando. ⚡ = Sfida con punti doppi!" />
        </div>
      </div>

      <PendingApprovalCard {...pending} />

      <div style={{ display: "flex", gap: 3, overflowX: "auto", marginBottom: 6, paddingBottom: 3 }}>
        <Pill active={cat === "all"} onClick={() => setCat("all")} color={P.acc} s>
          Tutte
        </Pill>
        {CATS.map((c) => (
          <Pill key={c.id} active={cat === c.id} onClick={() => setCat(c.id)} color={c.c} s>
            {c.i}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
        {PTS_FILTERS.map((f) => (
          <Pill key={f.k} active={pts === f.k} onClick={() => setPts(f.k)} color={P.mint} s>
            {f.l}
          </Pill>
        ))}
      </div>

      {filtered.map((a) => {
        const done = todayDone(a.id);
        const inPeriod = periodDone(a);
        const byTod = todayByTod(a.id);
        const full = inPeriod >= a.max;
        return (
          <GlassCard key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: full ? 0.45 : 1, padding: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14 }}>{actIcon(a)}</span>
                <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>{a.name}</span>
                {a.ch ? <span style={{ background: alpha(P.gold, 13), color: P.gold, padding: "1px 5px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>⚡</span> : null}
                <span style={{ background: P.glass, color: P.tx3, padding: "1px 6px", borderRadius: 5, fontSize: 8 }}>{FREQ_SHORT[a.freq]}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: P.mint }}>+{a.pts}pt</span>
                {a.duration ? <span style={{ fontSize: 10, color: P.gold }}>⏱ {a.duration}min</span> : null}
                {a.pen < 0 && <span style={{ fontSize: 10, color: P.red }}>{a.pen}pt</span>}
                <span style={{ fontSize: 10, color: P.tx3 }}>
                  ×{a.max}/{FREQ_UNIT[a.freq]}
                </span>
              </div>
              {inPeriod > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                  {TODS.filter((t) => byTod[t.k] > 0).map((t) => (
                    <span key={t.k} style={{ background: alpha(P.gold, 9), color: P.gold, padding: "1px 6px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>
                      {t.l.split(" ")[0]} ×{byTod[t.k]}
                    </span>
                  ))}
                  <span style={{ fontSize: 9, color: P.tx3 }}>
                    {inPeriod}/{a.max} {PERIOD_WORD[a.freq]}
                    {a.freq !== "daily" && done > 0 ? ` · ×${done} oggi` : ""}
                  </span>
                </div>
              )}
            </div>
            {full ? (
              <Btn small disabled color={P.mint}>
                ✅ Completata
              </Btn>
            ) : (
              <Btn small grad={grad} onClick={() => onMark(a, a.max - inPeriod)}>
                ✅ Fatto!
              </Btn>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

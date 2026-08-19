import { CATS, FREQ_UNIT } from "../../data/constants";
import type { Activity } from "../../data/types";
import { Btn, GlassCard } from "../../design/components";
import { P } from "../../design/tokens";

export default function AdminActivitiesTab({
  acts,
  onNew,
  onEdit,
  onDelete,
}: {
  acts: Activity[];
  onNew: () => void;
  onEdit: (a: Activity) => void;
  onDelete: (a: Activity) => void;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>{acts.length} attività</span>
        <Btn small grad={P.accG} onClick={onNew}>
          + Nuova
        </Btn>
      </div>
      {acts.map((a) => {
        const cat = CATS.find((c) => c.id === a.cat);
        return (
          <GlassCard key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 13 }}>{cat?.i}</span>
                <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>{a.name}</span>
                {a.ch ? <span style={{ background: P.gold + "22", color: P.gold, padding: "1px 5px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>⚡</span> : null}
              </div>
              <span style={{ fontSize: 10, color: P.tx3 }}>
                +{a.pts}pt {a.pen ? `/ ${a.pen}pt` : ""} · max ×{a.max}/{FREQ_UNIT[a.freq]}
                {a.duration ? ` · ⏱ ${a.duration}min` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <Btn small color={P.blue} onClick={() => onEdit(a)}>
                ✏️
              </Btn>
              <Btn small color={P.red} onClick={() => onDelete(a)}>
                🗑
              </Btn>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

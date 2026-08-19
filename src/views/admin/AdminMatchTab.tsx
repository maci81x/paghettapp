import type { Match } from "../../data/types";
import { Btn, GlassCard } from "../../design/components";
import { P, gls } from "../../design/tokens";

export default function AdminMatchTab({
  matches,
  onNew,
  onEdit,
  onDelete,
  onToggle,
}: {
  matches: Match[];
  onNew: () => void;
  onEdit: (m: Match) => void;
  onDelete: (m: Match) => void;
  onToggle: (id: number) => void;
}) {
  return (
    <div>
      {matches.map((m) => (
        <GlassCard key={m.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: P.tx, fontSize: 13, fontWeight: 700, margin: "0 0 2px" }}>⚔️ {m.name}</p>
              {m.desc && <p style={{ color: P.tx2, fontSize: 11, margin: "0 0 2px", lineHeight: 1.4 }}>{m.desc}</p>}
              {m.prize && <p style={{ color: P.gold, fontSize: 11, margin: 0 }}>🏆 {m.prize}</p>}
              <p style={{ color: P.tx3, fontSize: 10, margin: "2px 0 0" }}>
                📋 {m.act} · ⏱ {m.durDays}gg
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginLeft: 8 }}>
              <button
                onClick={() => onToggle(m.id)}
                title={m.vis ? "Visibile alle figlie" : "Nascosto"}
                style={{ ...gls, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontWeight: 600, color: m.vis ? P.mint : P.tx3, borderColor: m.vis ? P.mint + "44" : P.gb }}
              >
                {m.vis ? "👁" : "🙈"}
              </button>
              <Btn small color={P.blue} onClick={() => onEdit(m)}>
                ✏️
              </Btn>
              <Btn small color={P.red} onClick={() => onDelete(m)}>
                🗑
              </Btn>
            </div>
          </div>
        </GlassCard>
      ))}
      <Btn full grad={P.accG} style={{ marginTop: 8 }} onClick={onNew}>
        + Nuovo Match
      </Btn>
    </div>
  );
}

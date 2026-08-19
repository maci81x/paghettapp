import { USER_IDS } from "../../data/constants";
import { missionProg } from "../../data/report";
import type { Activity, Mission, UserId, Users } from "../../data/types";
import { Btn, GlassCard } from "../../design/components";
import { P } from "../../design/tokens";

export default function AdminMissionsTab({
  users,
  acts,
  onNew,
  onEdit,
  onDelete,
}: {
  users: Users;
  acts: Activity[];
  onNew: () => void;
  onEdit: (m: Mission) => void;
  onDelete: (uid: UserId, id: number) => void;
}) {
  const actNames = (ids: number[]) =>
    ids
      .map((id) => acts.find((a) => a.id === id)?.name)
      .filter(Boolean)
      .join(", ");

  return (
    <div>
      {USER_IDS.map((uid) => (
        <div key={uid}>
          <p style={{ color: users[uid].c, fontWeight: 700, fontSize: 12, margin: "8px 0 4px" }}>{users[uid].n}</p>
          {users[uid].miss.length === 0 ? (
            <p style={{ color: P.tx3, fontSize: 11, margin: "0 0 8px" }}>Nessuna missione</p>
          ) : (
            users[uid].miss.map((m) => {
              const linked = m.actIds ?? [];
              return (
                <GlassCard key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12 }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <p style={{ color: P.tx, fontSize: 12, fontWeight: 600, margin: 0 }}>{m.name}</p>
                    {m.desc && <p style={{ color: P.tx2, fontSize: 10, margin: "2px 0 0", lineHeight: 1.4 }}>{m.desc}</p>}
                    <p style={{ color: P.tx3, fontSize: 10, margin: "2px 0 0" }}>
                      {missionProg(users[uid], m)}/{m.tgt} · +{m.pts}pt {m.team ? "👥" : "👤"}
                      {m.deadline ? ` · ⏳ ${m.deadline}` : ""}
                    </p>
                    <p style={{ color: linked.length > 0 ? P.mint : P.tx3, fontSize: 9, margin: "2px 0 0" }}>
                      {linked.length > 0 ? `🔗 ${actNames(linked)}` : "✋ progresso manuale"}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn small color={P.blue} onClick={() => onEdit(m)}>
                      ✏️
                    </Btn>
                    <Btn small color={P.red} onClick={() => onDelete(uid, m.id)}>
                      🗑
                    </Btn>
                  </div>
                </GlassCard>
              );
            })
          )}
        </div>
      ))}
      <Btn full grad={P.accG} style={{ marginTop: 10 }} onClick={onNew}>
        + Nuova Missione
      </Btn>
    </div>
  );
}

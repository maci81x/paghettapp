import { TODS, USER_IDS } from "../../data/constants";
import type { Activity, LogEntry, UserId, Users } from "../../data/types";
import { Btn, GlassCard } from "../../design/components";
import { P } from "../../design/tokens";

export default function ApproveTab({
  users,
  acts,
  onApprove,
  onReject,
}: {
  users: Users;
  acts: Activity[];
  onApprove: (uid: UserId, logId: number) => void;
  onReject: (uid: UserId, logId: number) => void;
}) {
  const pending = USER_IDS.flatMap((uid) =>
    users[uid].log
      .filter((l) => !l.ok)
      .map((l) => ({ uid, l, a: acts.find((x) => x.id === l.actId) })),
  ).filter((x): x is { uid: UserId; l: LogEntry; a: Activity } => !!x.a);

  if (pending.length === 0) {
    return (
      <GlassCard>
        <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 16 }}>Nessuna attività da approvare 🎉</p>
      </GlassCard>
    );
  }

  return (
    <div>
      {pending.map((p) => (
        <GlassCard key={`${p.uid}-${p.l.id}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  background: users[p.uid].grad,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                }}
              >
                {users[p.uid].av}
              </div>
              <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>
                {p.a.name} ×{p.l.cnt}
              </span>
            </div>
            <p style={{ color: P.tx3, fontSize: 10, margin: "2px 0 0 28px" }}>
              {TODS.find((t) => t.k === p.l.tod)?.l} {p.l.note && `· ${p.l.note}`}
            </p>
            <span style={{ fontSize: 10, color: P.mint, marginLeft: 28 }}>+{p.l.pts}pt</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <Btn small grad={P.mintG} onClick={() => onApprove(p.uid, p.l.id)}>
              ✓
            </Btn>
            <Btn small color={P.red} onClick={() => onReject(p.uid, p.l.id)}>
              ✗
            </Btn>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

import TierBar from "../../components/TierBar";
import { USER_IDS, getLvl, getTier } from "../../data/constants";
import type { UserId, Users } from "../../data/types";
import { Avatar, GlassCard } from "../../design/components";
import { P } from "../../design/tokens";

/**
 * Riepilogo delle due figlie in cima alla schermata admin: punti, tier,
 * livello e streak si leggono a colpo d'occhio, senza aprire la scheda.
 */
export default function AdminChildrenSummary({
  users,
  weekPts,
  onOpen,
}: {
  users: Users;
  weekPts: (uid: UserId) => number;
  onOpen: (uid: UserId) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
      {USER_IDS.map((uid) => {
        const u = users[uid];
        const wp = weekPts(uid);
        const tier = getTier(wp);
        const lvl = getLvl(u.totalPts);

        return (
          <GlassCard
            key={uid}
            onClick={() => onOpen(uid)}
            style={{ padding: 12, marginBottom: 0, cursor: "pointer", background: `linear-gradient(135deg,${u.c}12,transparent)`, border: `1px solid ${u.c}2a` }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Avatar photo={u.profilePhoto} emoji={u.av} size={38} radius={12} grad={u.grad} style={{ boxShadow: `0 4px 12px ${u.c}33` }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: P.tx, fontSize: 13, fontWeight: 800, margin: 0, letterSpacing: -0.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {u.n}
                </p>
                <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>🔥 {u.streak}gg di fila</p>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: P.tx, letterSpacing: -0.4 }}>
              {wp}pt <span style={{ color: P.tx3, fontWeight: 600 }}>→</span> <span style={{ color: P.gold }}>€{tier.r}</span>
            </p>

            <div style={{ marginTop: 6 }}>
              <TierBar wp={wp} color={u.c} grad={u.grad} compact />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 7, borderTop: `1px solid ${P.gb}` }}>
              <span style={{ fontSize: 10, color: lvl.c, fontWeight: 700 }}>
                {lvl.i} {lvl.n}
              </span>
              <span style={{ fontSize: 10, color: P.tx2, fontWeight: 700 }}>{u.totalPts}pt tot</span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

import { useState } from "react";
import { CATS, daysLeft } from "../../data/constants";
import type { MissionState } from "../../data/missions";
import { assignees, byState, missionProgress, missionState } from "../../data/missions";
import type { Activity, Match, Mission, UserId, Users } from "../../data/types";
import { Avatar, GlassCard, InfoTip, SectionTitle } from "../../design/components";
import { userColor, userGrad, userName } from "../../design/theme";
import { P, alpha } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

/** Countdown alla scadenza: rosso sotto i 3 giorni, come chiede il colpo d'occhio. */
function Deadline({ iso }: { iso: string }) {
  const d = daysLeft(iso);
  const urgent = d < 3;
  const color = d < 0 ? P.red : urgent ? P.red : P.mint;
  const label = d < 0 ? `Scaduta da ${-d}gg` : d === 0 ? "Scade oggi!" : `Scade il ${fmtDay(iso)}`;
  return (
    <span style={{ background: alpha(color, 9), color, padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>⏰ {label}</span>
  );
}

const LONG_DESC = 110;

const STATE_STYLE: Record<MissionState, { border: string; label: string; color: string }> = {
  active: { border: "", label: "", color: "" },
  done: { border: P.mint, label: "🎉 Completata!", color: P.mint },
  expired: { border: P.red, label: "⏰ Scaduta", color: P.red },
};

function MissionCard({ m, uid, users, acts, grad, collapsed }: { m: Mission; uid: UserId; users: Users; acts: Activity[]; grad: string; collapsed?: boolean }) {
  const [open, setOpen] = useState(!collapsed);
  const [readMore, setReadMore] = useState(false);

  const prog = missionProgress(users, m, uid);
  const state = missionState(m, prog.done);
  const style = STATE_STYLE[state];
  const desc = m.desc ?? "";
  const long = desc.length > LONG_DESC;
  const linked = (m.actIds ?? []).map((id) => acts.find((a) => a.id === id)).filter((a): a is Activity => !!a);
  const others = assignees(m).filter((x) => x !== uid);
  // in individuale il confronto si mostra solo se la sorella ha già finito
  const finishedOthers = m.team ? [] : others.filter((x) => (prog.byUser[x] ?? 0) >= m.tgt);
  const pct = Math.round(prog.pct);
  const awarded = !!m.completedBy?.[uid];

  return (
    <GlassCard style={style.border ? { border: `1.5px solid ${alpha(style.border, 33)}`, background: `linear-gradient(135deg,${alpha(style.border, 4)},transparent)` } : undefined}>
      <div
        onClick={collapsed ? () => setOpen((v) => !v) : undefined}
        style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: collapsed ? "pointer" : undefined }}
      >
        <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{m.emoji || "🎯"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: P.tx, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: -0.2 }}>{m.name}</p>
          <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <span
              style={{
                background: alpha(m.team ? P.blue : P.acc, 12),
                color: m.team ? P.blue : P.acc,
                padding: "2px 7px",
                borderRadius: 6,
                fontSize: 9,
                fontWeight: 800,
              }}
            >
              {m.team ? "🤝 Squadra" : "👤 Individuale"}
            </span>
            <span style={{ background: alpha(P.gold, 12), color: P.gold, padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 800 }}>
              🏆 +{m.pts}pt
            </span>
            {m.deadline && state !== "done" ? <Deadline iso={m.deadline} /> : null}
            {style.label && (
              <span style={{ background: alpha(style.color, 12), color: style.color, padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 800 }}>
                {style.label}
                {state === "done" && m.completedBy?.[uid] ? ` ${fmtDay(m.completedBy[uid]!)}` : ""}
              </span>
            )}
          </div>
        </div>
        {collapsed && <span style={{ color: P.tx3, fontSize: 11, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>}
      </div>

      {open && (
        <>
          <p style={{ color: P.tx3, fontSize: 10, margin: "8px 0 0", fontWeight: 600 }}>
            {m.team ? "🤝 Collaborate per raggiungere l'obiettivo!" : "Solo per te"}
          </p>

          {desc && (
            <p style={{ color: P.tx2, fontSize: 11, lineHeight: 1.5, margin: "6px 0 0" }}>
              {long && !readMore ? `${desc.slice(0, LONG_DESC)}… ` : `${desc} `}
              {long && (
                <button
                  onClick={() => setReadMore(!readMore)}
                  style={{ background: "none", border: "none", color: P.acc, fontSize: 10, fontWeight: 700, cursor: "pointer", padding: 0 }}
                >
                  {readMore ? "meno" : "leggi tutto"}
                </button>
              )}
            </p>
          )}

          {linked.length > 0 && (
            <p style={{ color: P.tx2, fontSize: 10, margin: "8px 0 0", lineHeight: 1.5 }}>
              <b style={{ color: P.tx }}>📋 Regole:</b> completa {m.tgt} volte{" "}
              {linked.map((a) => `${CATS.find((c) => c.id === a.cat)?.i ?? ""} ${a.name}`).join(", ")}
            </p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "10px 0 4px" }}>
            <span style={{ color: P.tx2, fontSize: 11, fontWeight: 700 }}>
              {m.team ? "Insieme" : "Il tuo progresso"}: {prog.current}/{m.tgt}
            </span>
            <span style={{ color: prog.done ? P.mint : P.tx3, fontSize: 11, fontWeight: 800 }}>{pct}% completata</span>
          </div>
          <div style={{ background: P.track, borderRadius: 6, height: 12, overflow: "hidden" }}>
            <div style={{ background: prog.done ? P.mintG : grad, borderRadius: 6, height: 12, width: `${prog.pct}%`, transition: "width .5s" }} />
          </div>

          {m.team && (
            <p style={{ color: P.tx3, fontSize: 10, margin: "5px 0 0" }}>
              {assignees(m)
                .map((who) => `${userName(users[who])}: ${prog.byUser[who] ?? 0}`)
                .join(" • ")}
            </p>
          )}

          {finishedOthers.length > 0 && (
            <p style={{ color: P.gold, fontSize: 10, margin: "5px 0 0", fontWeight: 700 }}>
              👏 {finishedOthers.map((x) => userName(users[x])).join(" e ")} ha già finito!
            </p>
          )}

          {awarded && <p style={{ color: P.mint, fontSize: 10, margin: "5px 0 0", fontWeight: 700 }}>🏆 +{m.pts}pt già assegnati</p>}
        </>
      )}
    </GlassCard>
  );
}

function Side({ uid, users, pts }: { uid: UserId; users: Users; pts: number }) {
  const u = users[uid];
  return (
    <div style={{ textAlign: "center" }}>
      <Avatar photo={u.profilePhoto} emoji={u.av} size={40} radius={12} grad={userGrad(u)} style={{ margin: "0 auto 3px" }} />
      <p style={{ color: userColor(u), fontWeight: 700, fontSize: 12, margin: 0 }}>{userName(u)}</p>
      <p style={{ color: P.tx, fontSize: 18, fontWeight: 800, margin: 0 }}>{pts}</p>
    </div>
  );
}

export default function MissionsTab({
  u,
  au,
  users,
  acts,
  matches,
  grad,
  weekPts,
}: {
  u: Users[UserId];
  au: UserId;
  users: Users;
  acts: Activity[];
  matches: Match[];
  grad: string;
  weekPts: (uid: UserId) => number;
}) {
  const visible = matches.filter((m) => m.vis);

  const rows = u.miss
    .map((m) => ({ m, state: missionState(m, missionProgress(users, m, au).done) }))
    .sort(byState);
  const active = rows.filter((r) => r.state === "active");
  const closed = rows.filter((r) => r.state !== "active");

  return (
    <div>
      <SectionTitle>
        Missioni <InfoTip text="Le missioni di squadra si completano insieme: i vostri progressi si sommano. Quelle individuali le porti a termine da sola." />
      </SectionTitle>

      {u.miss.length === 0 ? (
        <GlassCard>
          <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 16 }}>Nessuna missione attiva 🎯</p>
        </GlassCard>
      ) : (
        <>
          {active.map(({ m }) => (
            <MissionCard key={m.id} m={m} uid={au} users={users} acts={acts} grad={grad} />
          ))}

          {closed.length > 0 && (
            <>
              <p style={{ color: P.tx3, fontSize: 10, fontWeight: 800, letterSpacing: 0.4, margin: "14px 0 6px", textTransform: "uppercase" }}>
                Concluse ({closed.length})
              </p>
              {closed.map(({ m }) => (
                <MissionCard key={m.id} m={m} uid={au} users={users} acts={acts} grad={grad} collapsed />
              ))}
            </>
          )}
        </>
      )}

      {visible.length > 0 && (
        <>
          <p style={{ color: P.tx, fontSize: 15, fontWeight: 700, margin: "18px 0 10px", letterSpacing: -0.3 }}>⚔️ Match</p>
          {visible.map((m) => (
            <GlassCard key={m.id} style={{ background: `linear-gradient(135deg,${alpha(P.mia, 2)},${alpha(P.sam, 2)})` }}>
              <p style={{ color: P.tx, fontSize: 14, fontWeight: 700, margin: "0 0 3px", textAlign: "center" }}>{m.name}</p>
              {m.desc && <p style={{ color: P.tx2, fontSize: 10, margin: "0 0 3px", textAlign: "center", lineHeight: 1.4 }}>{m.desc}</p>}
              {m.prize && <p style={{ color: P.gold, fontSize: 10, margin: "0 0 8px", textAlign: "center" }}>🏆 {m.prize}</p>}
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                <Side uid="mia" users={users} pts={weekPts("mia")} />
                <span style={{ fontSize: 20, color: P.tx3 }}>VS</span>
                <Side uid="samira" users={users} pts={weekPts("samira")} />
              </div>
              <p style={{ color: P.tx3, fontSize: 9, margin: "6px 0 0", textAlign: "center" }}>
                📋 {m.act} · ⏱ {m.durDays}gg
              </p>
            </GlassCard>
          ))}
        </>
      )}
    </div>
  );
}

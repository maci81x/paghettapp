import { useState } from "react";
import { daysLeft } from "../../data/constants";
import { missionProg } from "../../data/report";
import type { Activity, Match, Mission, User, Users } from "../../data/types";
import { GlassCard, InfoTip, Ring, SectionTitle } from "../../design/components";
import { P } from "../../design/tokens";

/** Countdown alla scadenza: verde >3gg, arancio 1-3gg, rosso scaduta. */
function Deadline({ iso }: { iso: string }) {
  const d = daysLeft(iso);
  const color = d < 0 ? P.red : d <= 3 ? P.gold : P.mint;
  const label = d < 0 ? `Scaduta da ${-d}gg` : d === 0 ? "Scade oggi!" : `${d} giorn${d === 1 ? "o" : "i"} rimast${d === 1 ? "o" : "i"}`;
  return (
    <span style={{ background: color + "18", color, padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>
      ⏳ {label}
    </span>
  );
}

const LONG_DESC = 110;

function MissionCard({ m, u, acts }: { m: Mission; u: User; acts: Activity[] }) {
  const [open, setOpen] = useState(false);
  const desc = m.desc ?? "";
  const long = desc.length > LONG_DESC;
  const prog = missionProg(u, m);
  const pct = Math.min(100, (prog / m.tgt) * 100);
  const linked = (m.actIds ?? []).map((id) => acts.find((a) => a.id === id)).filter((a): a is Activity => !!a);
  const done = prog >= m.tgt;
  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: P.tx, fontSize: 14, fontWeight: 700, margin: 0 }}>{m.name}</p>
          <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ background: P.acc + "18", color: P.acc, padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>
              {m.team ? "👥 Squadra" : "👤 Individuale"}
            </span>
            <span style={{ background: P.gold + "18", color: P.gold, padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>+{m.pts}pt</span>
            {m.deadline ? <Deadline iso={m.deadline} /> : null}
            {done && <span style={{ background: P.mint + "18", color: P.mint, padding: "2px 7px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>✅ Completata</span>}
          </div>
        </div>
        <Ring pct={pct} size={48} stroke={4} color={done ? P.mint : P.acc}>
          <span style={{ fontSize: 11, fontWeight: 800, color: P.tx }}>
            {prog}/{m.tgt}
          </span>
        </Ring>
      </div>

      {desc && (
        <p style={{ color: P.tx2, fontSize: 11, lineHeight: 1.5, margin: "8px 0 0" }}>
          {long && !open ? `${desc.slice(0, LONG_DESC)}… ` : `${desc} `}
          {long && (
            <button
              onClick={() => setOpen(!open)}
              style={{ background: "none", border: "none", color: P.acc, fontSize: 10, fontWeight: 700, cursor: "pointer", padding: 0 }}
            >
              {open ? "meno" : "leggi tutto"}
            </button>
          )}
        </p>
      )}

      <div style={{ background: P.glass, borderRadius: 3, height: 6, marginTop: 8 }}>
        <div style={{ background: done ? P.mintG : P.accG, borderRadius: 3, height: 6, width: `${pct}%`, transition: "width .5s" }} />
      </div>
      <p style={{ color: P.tx3, fontSize: 9, margin: "3px 0 0" }}>
        {prog}/{m.tgt} completamenti
        {linked.length > 0 && ` · avanza con: ${linked.map((a) => a.name).join(", ")}`}
      </p>
    </GlassCard>
  );
}

function Side({ uid, users, pts }: { uid: "mia" | "samira"; users: Users; pts: number }) {
  const u = users[uid];
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{ width: 40, height: 40, borderRadius: 12, background: u.grad, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 3px" }}
      >
        {u.av}
      </div>
      <p style={{ color: u.c, fontWeight: 700, fontSize: 12, margin: 0 }}>{u.n}</p>
      <p style={{ color: P.tx, fontSize: 18, fontWeight: 800, margin: 0 }}>{pts}</p>
    </div>
  );
}

export default function MissionsTab({
  u,
  users,
  acts,
  matches,
  weekPts,
}: {
  u: User;
  users: Users;
  acts: Activity[];
  matches: Match[];
  weekPts: (uid: "mia" | "samira") => number;
}) {
  const visible = matches.filter((m) => m.vis);
  return (
    <div>
      <SectionTitle>
        Missioni <InfoTip text="Completa le missioni per bonus! I match sono sfide tra sorelle." />
      </SectionTitle>

      {u.miss.length === 0 ? (
        <GlassCard>
          <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 16 }}>Nessuna missione attiva 🎯</p>
        </GlassCard>
      ) : (
        u.miss.map((m) => <MissionCard key={m.id} m={m} u={u} acts={acts} />)
      )}

      {visible.length > 0 && (
        <>
          <p style={{ color: P.tx, fontSize: 15, fontWeight: 700, margin: "18px 0 10px", letterSpacing: -0.3 }}>⚔️ Match</p>
          {visible.map((m) => (
            <GlassCard key={m.id} style={{ background: `linear-gradient(135deg,${P.mia}06,${P.sam}06)` }}>
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

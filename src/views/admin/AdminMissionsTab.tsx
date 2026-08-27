import { useState } from "react";
import { CATS, USER_IDS, daysLeft } from "../../data/constants";
import type { MissionState } from "../../data/missions";
import { assignees, byState, missionProgress, missionState } from "../../data/missions";
import type { Range } from "../../data/movements";
import { RANGES, inRange } from "../../data/movements";
import type { Activity, Mission, UserId, Users } from "../../data/types";
import { Btn, GlassCard, InfoTip, Pill } from "../../design/components";
import { useSelection } from "../../hooks/useSelection";
import { P, alpha } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

const STATE_STYLE: Record<MissionState, { label: string; color: string }> = {
  active: { label: "In corso", color: P.acc },
  done: { label: "🎉 Completata", color: P.mint },
  expired: { label: "⏰ Scaduta", color: P.red },
};

export default function AdminMissionsTab({
  users,
  acts,
  awardsSupported,
  onNew,
  onEdit,
  onDelete,
  onBump,
  canHide,
  onToggleHidden,
  onToggleHiddenMany,
  onDeleteMany,
}: {
  users: Users;
  acts: Activity[];
  /** Falso finché manca `missions.completed_by`: i punti non partono da soli. */
  awardsSupported: boolean;
  onNew: () => void;
  onEdit: (m: Mission) => void;
  onDelete: (uid: UserId, id: number) => void;
  /** Contatore manuale delle missioni senza attività collegate. */
  onBump: (uid: UserId, id: number, delta: number) => void;
  /** false finché la migrazione `missions_hidden` non è applicata. */
  canHide: boolean;
  onToggleHidden: (m: Mission) => void;
  onToggleHiddenMany: (ids: number[], hidden: boolean) => void;
  /** Chiede conferma ed elimina: false se l'admin annulla. */
  onDeleteMany: (ids: number[]) => boolean;
}) {
  const [range, setRange] = useState<Range>("all");

  // la stessa missione compare in `miss` di entrambe: qui va elencata una volta
  const seen = new Set<number>();
  const rows = USER_IDS.flatMap((uid) =>
    users[uid].miss.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    }),
  )
    .map((m) => ({ m, state: missionState(m, assignees(m).some((uid) => missionProgress(users, m, uid).done)) }))
    .sort(byState);

  const active = rows.filter((r) => r.state === "active");
  const closed = rows.filter((r) => r.state !== "active");

  // la selezione multipla lavora sulle missioni in corso: lo storico non si tocca in blocco
  const s = useSelection(active.map(({ m }) => m));

  // se ho selezionato solo missioni già nascoste, il pulsante utile è "mostra"
  const pickedHidden = active.filter(({ m }) => s.isPicked(m.id) && m.hidden).length;
  const showRatherThanHide = s.count > 0 && pickedHidden === s.count;

  /** Della missione conclusa conta il giorno del premio; se manca, la scadenza. */
  const closedDate = (m: Mission) => Object.values(m.completedBy ?? {})[0] ?? m.deadline ?? "";
  const closedInRange = closed.filter(({ m }) => range === "all" || inRange(closedDate(m), range));

  const actName = (id: number) => {
    const a = acts.find((x) => x.id === id);
    return a ? `${CATS.find((c) => c.id === a.cat)?.i ?? ""} ${a.name}` : null;
  };

  const Card = ({ m, state, pickable = false }: { m: Mission; state: MissionState; pickable?: boolean }) => {
    const style = STATE_STYLE[state];
    const off = !!m.hidden;
    const manual = (m.actIds ?? []).length === 0;
    const linked = (m.actIds ?? []).map(actName).filter(Boolean);
    const left = m.deadline ? daysLeft(m.deadline) : null;

    return (
      <GlassCard
        onClick={pickable && s.selecting ? () => s.toggle(m.id) : undefined}
        style={{
          padding: 12,
          opacity: off ? 0.5 : 1,
          cursor: pickable && s.selecting ? "pointer" : undefined,
          border: pickable && s.selecting && s.isPicked(m.id) ? `1px solid ${alpha(P.acc, 40)}` : undefined,
          background: pickable && s.selecting && s.isPicked(m.id) ? alpha(P.acc, 7) : off ? alpha(P.tx3, 6) : undefined,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          {pickable && s.selecting && (
            <input
              type="checkbox"
              checked={s.isPicked(m.id)}
              onChange={() => s.toggle(m.id)}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 17, height: 17, accentColor: P.acc, flexShrink: 0, cursor: "pointer", marginTop: 2 }}
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: P.tx, fontSize: 13, fontWeight: 700, margin: 0, textDecoration: off ? "line-through" : undefined }}>
              {m.emoji || "🎯"} {m.name}
            </p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
              <span
                style={{
                  background: alpha(m.team ? P.blue : P.acc, 12),
                  color: m.team ? P.blue : P.acc,
                  padding: "1px 6px",
                  borderRadius: 5,
                  fontSize: 9,
                  fontWeight: 800,
                }}
              >
                {m.team ? "🤝 Squadra" : "👤 Individuale"}
              </span>
              <span style={{ background: alpha(P.gold, 12), color: P.gold, padding: "1px 6px", borderRadius: 5, fontSize: 9, fontWeight: 800 }}>
                🏆 +{m.pts}pt
              </span>
              <span style={{ background: alpha(style.color, 12), color: style.color, padding: "1px 6px", borderRadius: 5, fontSize: 9, fontWeight: 800 }}>
                {style.label}
              </span>
              {off && (
                <span style={{ background: alpha(P.tx3, 20), color: P.tx2, padding: "1px 6px", borderRadius: 5, fontSize: 9, fontWeight: 800 }}>NASCOSTA</span>
              )}
              {m.deadline && (
                <span style={{ color: left !== null && left < 3 ? P.red : P.tx3, fontSize: 9, fontWeight: 600, padding: "1px 4px" }}>
                  ⏰ {fmtDay(m.deadline)}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center", visibility: pickable && s.selecting ? "hidden" : undefined }}>
            <button
              onClick={() => onToggleHidden(m)}
              disabled={!canHide}
              title={off ? "Mostra alle ragazze" : "Nascondi alle ragazze"}
              style={{
                background: "none",
                border: "none",
                fontSize: 16,
                lineHeight: 1,
                padding: "4px 2px",
                cursor: canHide ? "pointer" : "default",
                opacity: canHide ? 1 : 0.3,
              }}
            >
              {off ? "👁️‍🗨️" : "👁️"}
            </button>
            <Btn small color={P.blue} onClick={() => onEdit(m)}>
              ✏️
            </Btn>
            <Btn small color={P.red} onClick={() => onDelete(assignees(m)[0], m.id)}>
              🗑
            </Btn>
          </div>
        </div>

        {linked.length > 0 ? (
          <p style={{ color: P.tx3, fontSize: 9, margin: "5px 0 0" }}>🔗 {linked.join(", ")}</p>
        ) : (
          <p style={{ color: P.tx3, fontSize: 9, margin: "5px 0 0" }}>✋ progresso manuale</p>
        )}

        {assignees(m).map((uid) => {
          const prog = missionProgress(users, m, uid);
          const awarded = m.completedBy?.[uid];
          return (
            <div key={uid} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0 0" }}>
              <span style={{ color: users[uid].c, fontSize: 11, fontWeight: 700, minWidth: 54 }}>{users[uid].n}</span>
              <div style={{ flex: 1, background: P.track, borderRadius: 4, height: 8, overflow: "hidden" }}>
                <div style={{ background: prog.done ? P.mintG : users[uid].grad, height: 8, width: `${prog.pct}%`, transition: "width .5s" }} />
              </div>
              <span style={{ color: P.tx2, fontSize: 10, fontWeight: 700, minWidth: 38, textAlign: "right" }}>
                {m.team ? prog.current : prog.own}/{m.tgt}
              </span>
              {manual && (
                <span style={{ display: "flex", gap: 3 }}>
                  <Btn small outline color={P.tx3} onClick={() => onBump(uid, m.id, -1)}>
                    −
                  </Btn>
                  <Btn small outline color={P.mint} onClick={() => onBump(uid, m.id, 1)}>
                    +
                  </Btn>
                </span>
              )}
              {awarded && <span style={{ color: P.mint, fontSize: 9, fontWeight: 700 }}>🏆 {fmtDay(awarded)}</span>}
            </div>
          );
        })}
      </GlassCard>
    );
  };

  return (
    <div>
      {!awardsSupported && (
        <GlassCard style={{ padding: 10, background: alpha(P.gold, 6), border: `1px solid ${alpha(P.gold, 18)}` }}>
          <p style={{ color: P.gold, fontSize: 11, margin: 0, fontWeight: 600, lineHeight: 1.45 }}>
            ⚠️ I punti delle missioni non vengono assegnati in automatico: manca la colonna <code>completed_by</code> su <code>missions</code>.
            <span style={{ display: "block", color: P.tx3, fontWeight: 400, fontSize: 10, marginTop: 3 }}>
              Applica la migrazione <code>20260825_missions_completed_by.sql</code>. Senza, non c'è modo di ricordare chi è già stato premiato.
            </span>
          </p>
        </GlassCard>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>
          {active.length} in corso
          <InfoTip text="I punti arrivano da soli quando il progresso tocca l'obiettivo: in squadra a entrambe, da sole a chi ha finito." />
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {s.selecting ? (
            <>
              <Btn small outline color={P.blue} onClick={s.toggleAll}>
                {s.allSelected ? "Deseleziona tutte" : "Seleziona tutte"}
              </Btn>
              <Btn small outline color={P.tx3} onClick={s.exit}>
                Annulla
              </Btn>
            </>
          ) : (
            <>
              <Btn small outline color={P.acc} onClick={s.start} disabled={active.length === 0}>
                ☑️ Seleziona
              </Btn>
              <Btn small grad={P.accG} onClick={onNew}>
                + Nuova
              </Btn>
            </>
          )}
        </div>
      </div>

      {active.length === 0 ? (
        <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 12 }}>Nessuna missione in corso</p>
      ) : (
        active.map(({ m, state }) => <Card key={m.id} m={m} state={state} pickable />)
      )}

      {s.selecting && (
        <div style={{ position: "sticky", bottom: 8, marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <Btn
            full
            outline
            color={P.acc}
            disabled={s.count === 0 || !canHide}
            onClick={() => s.runOnSelection((ids) => onToggleHiddenMany(ids, !showRatherThanHide))}
          >
            {showRatherThanHide ? `👁️ Mostra selezionate (${s.count})` : `🙈 Nascondi selezionate (${s.count})`}
          </Btn>
          <Btn full color={P.red} disabled={s.count === 0} onClick={() => s.runOnSelection(onDeleteMany)}>
            🗑️ Elimina selezionate ({s.count})
          </Btn>
        </div>
      )}

      {closed.length > 0 && (
        <>
          <p style={{ color: P.tx, fontSize: 13, fontWeight: 700, margin: "16px 0 6px" }}>📜 Storico missioni</p>
          <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 3, marginBottom: 8 }}>
            <Pill active={range === "all"} onClick={() => setRange("all")} color={P.acc} s>
              Tutto
            </Pill>
            {RANGES.filter((r) => r.k !== "all").map((r) => (
              <Pill key={r.k} active={range === r.k} onClick={() => setRange(r.k)} color={P.acc} s>
                {r.l}
              </Pill>
            ))}
          </div>
          {closedInRange.length === 0 ? (
            <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 12 }}>Nessuna missione conclusa in questo periodo</p>
          ) : (
            closedInRange.map(({ m, state }) => <Card key={m.id} m={m} state={state} />)
          )}
        </>
      )}
    </div>
  );
}

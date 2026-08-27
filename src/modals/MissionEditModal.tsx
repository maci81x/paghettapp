import { CATS, USER_IDS, daysLeft } from "../data/constants";
import type { Activity, MissionDraft, UserId } from "../data/types";
import { Btn, Input, Label, Modal, Pill, TextArea } from "../design/components";
import { P, alpha } from "../design/tokens";
import { fmtDay } from "../utils/dates";

const EMOJI = ["🎯", "🌱", "📚", "🍳", "🧹", "🐕", "💪", "🎨", "🌍", "❤️", "⭐", "🔥"];

const TARGETS: { k: UserId | "both"; l: string }[] = [
  { k: "mia", l: "Mia" },
  { k: "samira", l: "Samira" },
  { k: "both", l: "Entrambe" },
];

export default function MissionEditModal({
  draft,
  setDraft,
  acts,
  names,
  onSave,
  onClose,
}: {
  draft: MissionDraft;
  setDraft: (fn: (d: MissionDraft) => MissionDraft) => void;
  acts: Activity[];
  /** Nomi mostrati alle figlie, per l'anteprima. */
  names: Record<UserId, string>;
  onSave: () => void;
  onClose: () => void;
}) {
  const toggleAct = (id: number) =>
    setDraft((d) => ({ ...d, actIds: d.actIds.includes(id) ? d.actIds.filter((x) => x !== id) : [...d.actIds, id] }));

  const linked = draft.actIds.map((id) => acts.find((a) => a.id === id)).filter((a): a is Activity => !!a);
  const targets: UserId[] = draft.to === "both" ? [...USER_IDS] : [draft.to];
  // la squadra ha senso solo con due assegnatarie: da sola non c'è nessuno con cui sommare
  const teamPossible = draft.to === "both";
  const team = draft.team && teamPossible;
  const left = draft.deadline ? daysLeft(draft.deadline) : null;
  /**
   * Un'attività nascosta non si può collegare a una missione nuova, ma se era
   * già collegata resta in elenco: così la missione in corso continua a
   * contarla e l'admin può comunque staccarla.
   */
  const linkable = acts.filter((a) => !a.hidden || draft.actIds.includes(a.id));

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{draft.mode === "add" ? "Nuova Missione" : "Modifica Missione"}</h3>

      <Label>Emoji e nome</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
        <Input
          value={draft.emoji}
          maxLength={2}
          onChange={(e) => setDraft((d) => ({ ...d, emoji: e.target.value }))}
          style={{ width: 52, textAlign: "center", fontSize: 18, flexShrink: 0 }}
        />
        <Input placeholder="Nome missione" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 8 }}>
        {EMOJI.map((e) => (
          <Pill key={e} active={draft.emoji === e} onClick={() => setDraft((d) => ({ ...d, emoji: e }))} color={P.acc} s>
            {e}
          </Pill>
        ))}
      </div>

      <Label>Tipo</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <Btn
          style={{ flex: 1 }}
          small
          outline={team}
          color={P.acc}
          grad={team ? undefined : P.accG}
          onClick={() => setDraft((d) => ({ ...d, team: false }))}
        >
          👤 Individuale
        </Btn>
        <Btn
          style={{ flex: 1, opacity: teamPossible ? 1 : 0.4 }}
          small
          outline={!team}
          color={P.blue}
          disabled={!teamPossible}
          onClick={() => setDraft((d) => ({ ...d, team: true }))}
        >
          🤝 Squadra
        </Btn>
      </div>
      <p style={{ fontSize: 9, color: P.tx3, margin: "-4px 0 8px", lineHeight: 1.4 }}>
        {team
          ? "I progressi delle due si sommano verso un obiettivo comune, e i punti vanno a entrambe."
          : teamPossible
            ? "Ognuna corre verso il proprio obiettivo: i punti vanno solo a chi lo raggiunge."
            : "La squadra richiede che la missione sia assegnata a entrambe."}
      </p>

      <Label>Assegnata a</Label>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {TARGETS.map((t) => (
          <Pill
            key={t.k}
            active={draft.to === t.k}
            onClick={() => setDraft((d) => ({ ...d, to: t.k, team: t.k === "both" ? d.team : false }))}
            color={P.mint}
            s
          >
            {t.l}
          </Pill>
        ))}
      </div>

      <Label>Descrizione (facoltativa)</Label>
      <TextArea
        rows={3}
        placeholder="Cosa bisogna fare, come, perché e quando."
        value={draft.desc}
        onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))}
        style={{ marginBottom: 8 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Obiettivo (quante volte)</Label>
          <Input type="number" min={1} value={draft.tgt} onChange={(e) => setDraft((d) => ({ ...d, tgt: Math.max(1, +e.target.value) }))} />
        </div>
        <div>
          <Label>Punti premio</Label>
          <Input type="number" value={draft.pts} onChange={(e) => setDraft((d) => ({ ...d, pts: +e.target.value }))} />
        </div>
      </div>

      <Label>Scadenza (facoltativa)</Label>
      <Input type="date" value={draft.deadline} onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))} style={{ marginBottom: 8 }} />

      <Label>Attività collegate</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 120, overflowY: "auto", marginBottom: 4 }}>
        {linkable.map((a) => (
          <Pill key={a.id} active={draft.actIds.includes(a.id)} color={CATS.find((c) => c.id === a.cat)?.c ?? P.acc} onClick={() => toggleAct(a.id)} s>
            {draft.actIds.includes(a.id) ? "☑" : "☐"} {a.hidden ? "🙈 " : ""}
            {CATS.find((c) => c.id === a.cat)?.i} {a.name}
          </Pill>
        ))}
      </div>
      <p style={{ fontSize: 9, color: P.tx3, margin: "0 0 10px" }}>
        {draft.actIds.length === 0
          ? "Nessuna attività: il progresso lo avanzi tu a mano, con i pulsanti + e −."
          : `${draft.actIds.length} collegate · ogni completamento approvato conta +1`}
      </p>

      {/* Anteprima: la stessa lettura che ne daranno le figlie */}
      <div style={{ background: P.glass, border: `1px solid ${P.gb}`, borderRadius: 12, padding: 10, marginBottom: 12 }}>
        <p style={{ color: P.tx3, fontSize: 9, fontWeight: 800, letterSpacing: 0.3, margin: "0 0 6px", textTransform: "uppercase" }}>Come la vedranno</p>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{draft.emoji || "🎯"}</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ color: P.tx, fontSize: 13, fontWeight: 800, margin: 0 }}>{draft.name.trim() || "Nome missione"}</p>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              <span
                style={{
                  background: alpha(team ? P.blue : P.acc, 12),
                  color: team ? P.blue : P.acc,
                  padding: "1px 6px",
                  borderRadius: 5,
                  fontSize: 9,
                  fontWeight: 800,
                }}
              >
                {team ? "🤝 Squadra" : "👤 Individuale"}
              </span>
              <span style={{ background: alpha(P.gold, 12), color: P.gold, padding: "1px 6px", borderRadius: 5, fontSize: 9, fontWeight: 800 }}>
                🏆 +{draft.pts}pt
              </span>
              {draft.deadline && (
                <span
                  style={{
                    background: alpha(left !== null && left < 3 ? P.red : P.mint, 12),
                    color: left !== null && left < 3 ? P.red : P.mint,
                    padding: "1px 6px",
                    borderRadius: 5,
                    fontSize: 9,
                    fontWeight: 800,
                  }}
                >
                  ⏰ Scade il {fmtDay(draft.deadline)}
                </span>
              )}
            </div>
            {draft.desc.trim() && <p style={{ color: P.tx2, fontSize: 10, margin: "5px 0 0", lineHeight: 1.45 }}>{draft.desc.trim()}</p>}
            {linked.length > 0 && (
              <p style={{ color: P.tx2, fontSize: 10, margin: "5px 0 0", lineHeight: 1.45 }}>
                <b style={{ color: P.tx }}>📋 Regole:</b> completa {draft.tgt} volte{" "}
                {linked.map((a) => `${CATS.find((c) => c.id === a.cat)?.i ?? ""} ${a.name}`).join(", ")}
              </p>
            )}
            <div style={{ background: P.track, borderRadius: 6, height: 12, marginTop: 8 }} />
            <p style={{ color: P.tx3, fontSize: 9, margin: "3px 0 0" }}>
              {team ? "Insieme" : "Il tuo progresso"}: 0/{draft.tgt} · a {targets.map((t) => names[t]).join(" e ")}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={P.mintG} onClick={onSave} disabled={!draft.name.trim()}>
          {draft.mode === "add" ? "Crea" : "Salva"}
        </Btn>
        <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

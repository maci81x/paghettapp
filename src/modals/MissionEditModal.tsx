import { CATS } from "../data/constants";
import type { Activity, MissionDraft, UserId } from "../data/types";
import { Btn, Input, Label, Modal, Pill, Sel, TextArea } from "../design/components";
import { P } from "../design/tokens";

export default function MissionEditModal({
  draft,
  setDraft,
  acts,
  onSave,
  onClose,
}: {
  draft: MissionDraft;
  setDraft: (fn: (d: MissionDraft) => MissionDraft) => void;
  acts: Activity[];
  onSave: () => void;
  onClose: () => void;
}) {
  const toggleAct = (id: number) =>
    setDraft((d) => ({ ...d, actIds: d.actIds.includes(id) ? d.actIds.filter((x) => x !== id) : [...d.actIds, id] }));

  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{draft.mode === "add" ? "Nuova Missione" : "Modifica Missione"}</h3>
      <Label>Nome</Label>
      <Input placeholder="Nome missione" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} style={{ marginBottom: 8 }} />

      <Label>Descrizione dettagliata</Label>
      <TextArea
        rows={4}
        placeholder="Cosa bisogna fare, come, perché e quando. Obiettivi precisi e misurabili."
        value={draft.desc}
        onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))}
        style={{ marginBottom: 8 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Obiettivo (quante volte)</Label>
          <Input type="number" value={draft.tgt} onChange={(e) => setDraft((d) => ({ ...d, tgt: Math.max(1, +e.target.value) }))} />
        </div>
        <div>
          <Label>Punti premio</Label>
          <Input type="number" value={draft.pts} onChange={(e) => setDraft((d) => ({ ...d, pts: +e.target.value }))} />
        </div>
      </div>

      <Label>Scadenza</Label>
      <Input type="date" value={draft.deadline} onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))} style={{ marginBottom: 8 }} />

      <Label>Attività collegate (avanzano da sole)</Label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 120, overflowY: "auto", marginBottom: 4 }}>
        {acts.map((a) => (
          <Pill key={a.id} active={draft.actIds.includes(a.id)} color={CATS.find((c) => c.id === a.cat)?.c ?? P.acc} onClick={() => toggleAct(a.id)} s>
            {CATS.find((c) => c.id === a.cat)?.i} {a.name}
          </Pill>
        ))}
      </div>
      <p style={{ fontSize: 9, color: P.tx3, margin: "0 0 8px" }}>
        {draft.actIds.length === 0
          ? "Nessuna attività: il progresso resta manuale."
          : `${draft.actIds.length} collegate · ogni completamento approvato conta +1`}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <Label>Assegna a</Label>
          <Sel value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value as UserId | "both" }))}>
            <option value="mia">Mia</option>
            <option value="samira">Samira</option>
            <option value="both">Entrambe</option>
          </Sel>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: P.tx2, paddingBottom: 8 }}>
          <input type="checkbox" checked={draft.team} onChange={(e) => setDraft((d) => ({ ...d, team: e.target.checked }))} />
          Squadra
        </label>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={P.mintG} onClick={onSave} disabled={!draft.name.trim()}>
          {draft.mode === "add" ? "Crea" : "Salva"}
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

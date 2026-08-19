import type { Activity, MatchDraft } from "../data/types";
import { Btn, Input, Label, Modal, Sel, TextArea } from "../design/components";
import { P } from "../design/tokens";

export default function MatchEditModal({
  draft,
  setDraft,
  acts,
  onSave,
  onClose,
}: {
  draft: MatchDraft;
  setDraft: (fn: (d: MatchDraft) => MatchDraft) => void;
  acts: Activity[];
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{draft.mode === "add" ? "Nuovo Match" : "Modifica Match"}</h3>
      <Label>Nome sfida</Label>
      <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} style={{ marginBottom: 8 }} />
      <Label>Descrizione</Label>
      <TextArea value={draft.desc} onChange={(e) => setDraft((d) => ({ ...d, desc: e.target.value }))} rows={2} style={{ marginBottom: 8 }} />
      <Label>Premio in palio</Label>
      <Input
        value={draft.prize}
        onChange={(e) => setDraft((d) => ({ ...d, prize: e.target.value }))}
        placeholder="Es: Scegliere il film del sabato"
        style={{ marginBottom: 8 }}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Attività</Label>
          <Sel value={draft.act} onChange={(e) => setDraft((d) => ({ ...d, act: e.target.value }))}>
            {acts.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </Sel>
        </div>
        <div>
          <Label>Durata (giorni)</Label>
          <Input type="number" value={draft.durDays} onChange={(e) => setDraft((d) => ({ ...d, durDays: Math.max(1, +e.target.value) }))} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
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

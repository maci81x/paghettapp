import { CATS, FREQ_UNIT, MAX_LABEL } from "../data/constants";
import type { ActivityDraft, Freq } from "../data/types";
import { Btn, Input, Label, Modal, Sel } from "../design/components";
import { P } from "../design/tokens";

export default function ActivityEditModal({
  draft,
  setDraft,
  onSave,
  onClose,
}: {
  draft: ActivityDraft;
  setDraft: (fn: (d: ActivityDraft) => ActivityDraft) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>{draft.mode === "add" ? "Nuova Attività" : "Modifica Attività"}</h3>
      <Label>Emoji e nome</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <Input
          value={draft.emoji}
          maxLength={2}
          placeholder="⭐"
          onChange={(e) => setDraft((d) => ({ ...d, emoji: e.target.value }))}
          style={{ width: 52, textAlign: "center", fontSize: 18, flexShrink: 0 }}
        />
        <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Categoria</Label>
          <Sel value={draft.cat} onChange={(e) => setDraft((d) => ({ ...d, cat: e.target.value }))}>
            {CATS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.i} {c.n}
              </option>
            ))}
          </Sel>
        </div>
        <div>
          <Label>Punti</Label>
          <Input type="number" value={draft.pts} onChange={(e) => setDraft((d) => ({ ...d, pts: +e.target.value }))} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Penalità</Label>
          <Input type="number" value={draft.pen} onChange={(e) => setDraft((d) => ({ ...d, pen: +e.target.value }))} />
        </div>
        <div>
          <Label>Frequenza</Label>
          <Sel value={draft.freq} onChange={(e) => setDraft((d) => ({ ...d, freq: e.target.value as Freq }))}>
            <option value="daily">Giornaliera</option>
            <option value="weekly">Settimanale</option>
            <option value="monthly">Mensile</option>
          </Sel>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>{MAX_LABEL[draft.freq]}</Label>
          <Input type="number" value={draft.max} onChange={(e) => setDraft((d) => ({ ...d, max: Math.max(1, +e.target.value) }))} />
        </div>
        <div>
          <Label>Durata (min)</Label>
          <Input
            type="number"
            placeholder="facoltativa"
            value={draft.duration}
            onChange={(e) => setDraft((d) => ({ ...d, duration: e.target.value }))}
          />
        </div>
      </div>
      <p style={{ fontSize: 9, color: P.tx3, margin: "-4px 0 8px" }}>
        Quante volte può essere completata per {FREQ_UNIT[draft.freq]} · ogni completamento vale +{draft.pts}pt
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <Label>Sfida?</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <input type="checkbox" checked={!!draft.ch} onChange={(e) => setDraft((d) => ({ ...d, ch: e.target.checked ? 1 : 0 }))} />
            <span style={{ fontSize: 11, color: P.tx2 }}>⚡ Sfida</span>
          </div>
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

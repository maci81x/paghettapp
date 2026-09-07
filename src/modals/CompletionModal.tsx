import { TODS, isoDate, todayISO } from "../data/constants";
import type { CompletionDraft } from "../data/types";
import { Btn, Label, Modal, Pill, TextArea } from "../design/components";
import { P, gls } from "../design/tokens";

/** Ieri in formato ISO: l'unico giorno passato che le ragazze possono segnare. */
const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return isoDate(d);
};

export default function CompletionModal({
  draft,
  setDraft,
  color,
  grad,
  remainingOn,
  onConfirm,
  onClose,
}: {
  draft: CompletionDraft;
  setDraft: (fn: (d: CompletionDraft) => CompletionDraft) => void;
  color: string;
  grad: string;
  /** Quante volte l'attività può ancora essere segnata in quel giorno. */
  remainingOn: (date: string) => number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const step = (n: number) => setDraft((d) => ({ ...d, cnt: Math.min(d.maxCnt, Math.max(1, d.cnt + n)) }));
  // solo oggi o ieri: più indietro lo storico lo corregge l'admin.
  // ogni giorno ha il suo limite, quindi ognuno porta quante volte gli restano
  const days = [
    { iso: todayISO(), l: "📅 Oggi" },
    { iso: yesterdayISO(), l: "📅 Ieri" },
  ].map((d) => ({ ...d, room: remainingOn(d.iso) }));

  /** Cambiando giorno cambia il massimo: il contatore si riporta dentro il nuovo limite. */
  const pickDay = (iso: string, room: number) =>
    setDraft((d) => ({ ...d, date: iso, maxCnt: Math.max(1, room), cnt: Math.min(d.cnt, Math.max(1, room)) }));
  return (
    <Modal onClose={onClose}>
      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>{draft.actName}</h3>
      {draft.duration ? (
        <p style={{ fontSize: 11, color: P.gold, margin: "0 0 10px" }}>⏱ Durata prevista: {draft.duration} min</p>
      ) : (
        <div style={{ height: 8 }} />
      )}
      <Label>Quante volte?</Label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <button onClick={() => step(-1)} style={{ ...gls, width: 36, height: 36, borderRadius: 10, fontSize: 18, cursor: "pointer", color: P.tx }}>
          −
        </button>
        <span style={{ fontSize: 28, fontWeight: 800, color: P.gold, minWidth: 30, textAlign: "center" }}>{draft.cnt}</span>
        <button onClick={() => step(1)} style={{ ...gls, width: 36, height: 36, borderRadius: 10, fontSize: 18, cursor: "pointer", color: P.tx }}>
          +
        </button>
        <span style={{ fontSize: 10, color: P.tx3 }}>
          max {draft.maxCnt}/{draft.freq}
        </span>
      </div>
      <Label>Che giorno?</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {days.map((d) => (
          <Pill key={d.iso} active={draft.date === d.iso} onClick={() => pickDay(d.iso, d.room)} color={color} disabled={d.room < 1}>
            {d.l}
          </Pill>
        ))}
      </div>
      {days.some((d) => d.room < 1) && (
        <p style={{ fontSize: 9, color: P.tx3, margin: "-4px 0 10px" }}>I giorni spenti li avevi già segnati tutte le volte che potevi.</p>
      )}

      <Label>Quando?</Label>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {TODS.map((t) => (
          <Pill key={t.k} active={draft.tod === t.k} onClick={() => setDraft((d) => ({ ...d, tod: t.k }))} color={color}>
            {t.l}
          </Pill>
        ))}
      </div>
      <p style={{ fontSize: 9, color: P.tx3, margin: "-4px 0 10px" }}>Ogni momento della giornata viene registrato a parte: puoi rifarla più tardi.</p>
      <Label>Nota (facoltativa)</Label>
      <TextArea
        value={draft.note}
        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        placeholder="Es: Passeggiata lunga al parco..."
        rows={2}
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1 }} grad={grad} onClick={onConfirm}>
          Invia ✓
        </Btn>
        <Btn style={{ flex: 1 }} color={P.tx3} onClick={onClose}>
          Annulla
        </Btn>
      </div>
    </Modal>
  );
}

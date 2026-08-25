import { useState } from "react";
import { CATS, MANUAL_ACT_LABEL, TODS, todayISO } from "../../data/constants";
import type { Activity, LogEntry } from "../../data/types";
import { Btn, GlassCard, Input } from "../../design/components";
import { P, alpha } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

/** Giorno di ieri in ISO: serve solo per l'etichetta del gruppo. */
const yesterdayISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const dayLabel = (date: string) => (date === todayISO() ? "Oggi" : date === yesterdayISO() ? "Ieri" : fmtDay(date));

/**
 * Cosa la ragazza ha segnato e l'admin non ha ancora guardato. Serve a due
 * cose: sapere che l'invio è partito davvero, e poter correggere la nota (o
 * ritirare del tutto) prima che qualcuno la legga.
 */
export default function PendingApprovalCard({
  log,
  acts,
  onEditNote,
  onWithdraw,
}: {
  log: LogEntry[];
  acts: Activity[];
  onEditNote: (logId: number, note: string) => void;
  onWithdraw: (l: LogEntry, name: string) => void;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  const pending = log.filter((l) => !l.ok && !l.revoked);
  if (pending.length === 0) return null;

  const nameOf = (l: LogEntry) => acts.find((a) => a.id === l.actId)?.name ?? MANUAL_ACT_LABEL[l.actId] ?? "Attività";

  // più recenti in alto: prima il giorno, poi l'ordine di inserimento
  const days = [...new Set(pending.map((l) => l.date))].sort((a, b) => (a < b ? 1 : -1));

  const save = (l: LogEntry) => {
    onEditNote(l.id, draft.trim());
    setEditing(null);
  };

  return (
    <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.gold, 6)},transparent)`, border: `1.5px solid ${alpha(P.gold, 22)}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>⏳ In attesa di approvazione</p>
        <span style={{ background: alpha(P.gold, 13), color: P.gold, borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>{pending.length}</span>
      </div>
      <p style={{ color: P.tx3, fontSize: 10, margin: "0 0 8px", lineHeight: 1.4 }}>
        I punti arrivano quando l'admin approva. Fino ad allora puoi correggere la nota o ritirare l'invio.
      </p>

      {days.map((day) => (
        <div key={day} style={{ marginBottom: 6 }}>
          <p style={{ color: P.tx3, fontSize: 9, fontWeight: 800, letterSpacing: 0.4, margin: "6px 0 2px", textTransform: "uppercase" }}>{dayLabel(day)}</p>
          {pending
            .filter((l) => l.date === day)
            .sort((a, b) => b.id - a.id)
            .map((l) => {
              const name = nameOf(l);
              const cat = CATS.find((c) => c.id === acts.find((a) => a.id === l.actId)?.cat);
              return (
                <div key={l.id} style={{ padding: "6px 0", borderBottom: `1px solid ${P.gb}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>
                        {cat?.i} {name}
                        {l.cnt > 1 ? ` ×${l.cnt}` : ""}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 1 }}>
                        <span style={{ fontSize: 10, color: P.gold, fontWeight: 700 }}>+{l.pts}pt in attesa</span>
                        <span style={{ fontSize: 9, color: P.tx3 }}>{TODS.find((t) => t.k === l.tod)?.l}</span>
                        <span style={{ fontSize: 9, color: P.gold, fontWeight: 600 }}>⏳ In attesa</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Btn
                        small
                        outline
                        color={P.blue}
                        onClick={() => {
                          setEditing(editing === l.id ? null : l.id);
                          setDraft(l.note);
                        }}
                      >
                        ✏️
                      </Btn>
                      <Btn small outline color={P.red} onClick={() => onWithdraw(l, name)}>
                        ❌
                      </Btn>
                    </div>
                  </div>

                  {editing === l.id ? (
                    <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 5 }}>
                      <Input
                        value={draft}
                        maxLength={120}
                        autoFocus
                        placeholder="Aggiungi una nota…"
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && save(l)}
                      />
                      <Btn small grad={P.mintG} onClick={() => save(l)}>
                        ✓
                      </Btn>
                      <Btn small outline color={P.tx3} onClick={() => setEditing(null)}>
                        ✕
                      </Btn>
                    </div>
                  ) : (
                    l.note && <p style={{ color: P.tx2, fontSize: 10, margin: "2px 0 0", lineHeight: 1.4 }}>📝 {l.note}</p>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </GlassCard>
  );
}

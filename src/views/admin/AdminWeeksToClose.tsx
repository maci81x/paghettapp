import { useState } from "react";
import { getTier } from "../../data/constants";
import type { UserId, Users } from "../../data/types";
import { weekLabel } from "../../data/weekBounds";
import { parseAmount } from "../../utils/money";
import { Btn, GlassCard, InfoTip, Input, Label } from "../../design/components";
import { P, alpha } from "../../design/tokens";

/** Fascia di punti del tier raggiunto: "250–349 pt", o "500+ pt" per l'ultima. */
const tierRange = (pts: number) => {
  const t = getTier(pts);
  return t.max >= 9999 ? `${t.min}+ pt` : `${t.min}–${t.max} pt`;
};

export interface WeekToClose {
  uid: UserId;
  week: string;
}

/**
 * "Settimane da chiudere": ogni settimana conclusa e non ancora saldata, per
 * entrambe le ragazze, con l'importo già calcolato dal tier. L'admin la
 * conferma così com'è, la modifica prima di confermarla, o le chiude tutte in
 * blocco. Nessuna si chiude da sola: il controllo resta all'admin.
 */
export default function AdminWeeksToClose({
  users,
  rows,
  dueFor,
  blockedFor,
  onConfirm,
}: {
  users: Users;
  /** Dalla più recente; più ragazze possono avere la stessa settimana. */
  rows: WeekToClose[];
  dueFor: (uid: UserId, week: string) => { pts: number; amount: number };
  /** Motivo per cui la ragazza non può ancora ricevere la paghetta (es. salvadanai senza nome). */
  blockedFor: (uid: UserId) => string | null;
  /** Registra la paghetta: restituisce l'errore in chiaro, o null se è andata. */
  onConfirm: (uid: UserId, week: string, override?: { amount: number; note: string }) => Promise<string | null>;
}) {
  const [edit, setEdit] = useState<{ key: string; amount: string; note: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const keyOf = (r: WeekToClose) => `${r.uid}:${r.week}`;
  const ready = rows.filter((r) => !blockedFor(r.uid));

  const confirmOne = async (r: WeekToClose, override?: { amount: number; note: string }) => {
    setBusy(keyOf(r));
    setErr(null);
    const res = await onConfirm(r.uid, r.week, override);
    setBusy(null);
    if (res) setErr(res);
    else setEdit(null);
  };

  const confirmAll = async () => {
    const total = ready.reduce((s, r) => s + dueFor(r.uid, r.week).amount, 0);
    if (!confirm(`Confermare ${ready.length} settimane per un totale di €${total.toFixed(2)}? Gli importi sono quelli del tier.`)) return;
    setBusy("all");
    setErr(null);
    // una alla volta: ogni accredito ricontrolla sul database che la settimana sia ancora libera
    for (const r of ready) {
      const res = await onConfirm(r.uid, r.week);
      if (res) {
        setErr(`${users[r.uid].n}, ${weekLabel(r.week)}: ${res}`);
        break;
      }
    }
    setBusy(null);
  };

  if (rows.length === 0) {
    return (
      <GlassCard style={{ padding: 12 }}>
        <p style={{ color: P.mint, fontSize: 12, fontWeight: 700, margin: 0 }}>✅ Nessuna settimana da chiudere</p>
        <p style={{ color: P.tx3, fontSize: 10, margin: "2px 0 0" }}>Il lunedì la settimana appena finita compare qui, con l'importo già calcolato.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ border: `1.5px solid ${alpha(P.gold, 45)}`, background: alpha(P.gold, 7) }}>
      <p style={{ color: P.gold, fontWeight: 800, fontSize: 14, margin: "0 0 2px" }}>
        🟠 Settimane da chiudere ({rows.length})
        <InfoTip text="Ogni lunedì la settimana appena finita viene calcolata dai punti delle attività fatte in quei giorni. Resta qui finché non la confermi: niente si chiude da solo. Confermando, i soldi vanno nei salvadanai con lo split 30/60/10." />
      </p>
      <p style={{ color: P.tx3, fontSize: 10, margin: "0 0 10px" }}>Importo calcolato dal tier · puoi modificarlo prima di confermare.</p>

      {rows.map((r) => {
        const u = users[r.uid];
        const k = keyOf(r);
        const due = dueFor(r.uid, r.week);
        const blocked = blockedFor(r.uid);
        const editing = edit?.key === k;
        const parsed = editing ? parseAmount(edit.amount) : null;
        return (
          <div key={k} style={{ padding: "10px 0", borderTop: `1px solid ${P.gb}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: u.c, fontSize: 13, fontWeight: 700, margin: 0 }}>
                  {u.av} {u.n}
                </p>
                <p style={{ color: P.tx2, fontSize: 11, margin: "1px 0 0" }}>
                  {weekLabel(r.week)} · <b style={{ color: P.tx }}>{due.pts} pt</b>
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ color: P.gold, fontSize: 17, fontWeight: 800, margin: 0 }}>€{due.amount.toFixed(2)}</p>
                <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>tier {tierRange(due.pts)}</p>
              </div>
            </div>

            {blocked ? (
              <p style={{ color: P.gold, fontSize: 10, margin: "6px 0 0" }}>⚠️ {blocked}</p>
            ) : editing ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <Label>Importo (€)</Label>
                    <Input
                      inputMode="decimal"
                      value={edit.amount}
                      onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                      style={{ borderColor: parsed === null ? P.red : undefined }}
                    />
                  </div>
                  <div style={{ flex: 2 }}>
                    <Label>Motivo (facoltativo)</Label>
                    <Input placeholder="es. settimana di vacanza" value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <Btn
                    small
                    grad={P.mintG}
                    style={{ flex: 1, minHeight: 44 }}
                    disabled={parsed === null || busy !== null}
                    onClick={() => parsed !== null && void confirmOne(r, { amount: parsed, note: edit.note })}
                  >
                    ✓ Conferma €{(parsed ?? 0).toFixed(2)}
                  </Btn>
                  <Btn small outline color={P.tx3} style={{ minHeight: 44 }} onClick={() => setEdit(null)}>
                    Annulla
                  </Btn>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn small grad={P.mintG} style={{ flex: 1, minHeight: 44 }} disabled={busy !== null} onClick={() => void confirmOne(r)}>
                  {busy === k ? "…" : "✓ Conferma"}
                </Btn>
                <Btn
                  small
                  outline
                  color={P.gold}
                  style={{ minHeight: 44 }}
                  disabled={busy !== null}
                  onClick={() => setEdit({ key: k, amount: due.amount.toFixed(2).replace(".", ","), note: "" })}
                >
                  ✏️ Modifica
                </Btn>
              </div>
            )}
          </div>
        );
      })}

      {err && <p style={{ color: P.red, fontSize: 11, margin: "8px 0 0", fontWeight: 600 }}>{err}</p>}

      {ready.length > 1 && (
        <Btn full grad={P.goldG} style={{ marginTop: 10, minHeight: 48 }} disabled={busy !== null} onClick={() => void confirmAll()}>
          {busy === "all" ? "Confermo…" : `✓ Conferma tutte (${ready.length})`}
        </Btn>
      )}
    </GlassCard>
  );
}

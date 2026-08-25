import { useMemo, useState } from "react";
import { BONUS_ACT, CATS, DEDUCT_ACT, MANUAL_ACT_LABEL, TODS, getWeekStart, isoDate, weekStartOf } from "../../data/constants";
import type { Activity, LogEntry, User } from "../../data/types";
import { Btn, GlassCard, InfoTip, Pill } from "../../design/components";
import { P } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

type Range = "week" | "prev" | "month" | "all";

/** Righe mostrate per volta: con "Tutto" lo storico cresce senza limite. */
const PAGE = 30;

const RANGES: { k: Range; l: string }[] = [
  { k: "week", l: "Questa settimana" },
  { k: "prev", l: "Settimana scorsa" },
  { k: "month", l: "Ultimo mese" },
  { k: "all", l: "Tutto" },
];

/** Lunedì della settimana precedente, in formato ISO. */
const prevWeekStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return weekStartOf(d);
};

const daysAgoISO = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return isoDate(d);
};

const inRange = (date: string, range: Range) => {
  switch (range) {
    case "week":
      return date >= getWeekStart();
    case "prev": {
      const start = prevWeekStart();
      return date >= start && date < getWeekStart();
    }
    case "month":
      return date >= daysAgoISO(30);
    case "all":
      return true;
  }
};

type Status = { label: string; color: string };

const statusOf = (l: LogEntry): Status => {
  if (l.ok) return { label: "✅ approvato", color: P.mint };
  if (l.revoked) return { label: "❌ annullato", color: P.red };
  return { label: "⏳ in attesa", color: P.gold };
};

/**
 * Storico completo dei punti di una figlia: l'admin può annullare
 * un'approvazione sbagliata o cancellare del tutto una voce inserita per
 * errore, anche di settimane passate.
 */
export default function AdminLogHistory({
  u,
  acts,
  onRevoke,
  onDelete,
  onDeduct,
}: {
  u: User;
  acts: Activity[];
  onRevoke: (l: LogEntry, name: string) => void;
  onDelete: (l: LogEntry, name: string) => void;
  onDeduct: () => void;
}) {
  const [range, setRange] = useState<Range>("week");
  const [shown, setShown] = useState(PAGE);

  const nameOf = (l: LogEntry) => MANUAL_ACT_LABEL[l.actId] ?? acts.find((a) => a.id === l.actId)?.name ?? "Attività eliminata";

  const rows = useMemo(
    () =>
      u.log
        .filter((l) => inRange(l.date, range))
        .slice()
        .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1)),
    [u.log, range],
  );

  const approved = rows.filter((l) => l.ok);
  const sum = approved.reduce((s, l) => s + l.pts, 0);

  return (
    <GlassCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>
          📋 Storico attività &amp; punti
          <InfoTip text="Annullare toglie i punti ma lascia la voce a storico. Eliminare la cancella del tutto: usalo solo per gli errori di inserimento." />
        </p>
        <Btn small outline color={P.red} onClick={onDeduct}>
          ➖ Togli punti
        </Btn>
      </div>

      <div style={{ display: "flex", gap: 3, overflowX: "auto", marginBottom: 8, paddingBottom: 3 }}>
        {RANGES.map((r) => (
          <Pill
            key={r.k}
            active={range === r.k}
            onClick={() => {
              setRange(r.k);
              setShown(PAGE);
            }}
            color={P.acc}
            s
          >
            {r.l}
          </Pill>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: P.tx3, marginBottom: 6 }}>
        <span>
          {rows.length} voci · {approved.length} approvate
        </span>
        <span style={{ color: sum >= 0 ? P.mint : P.red, fontWeight: 700 }}>
          {sum >= 0 ? "+" : "−"}
          {Math.abs(sum)}pt nel periodo
        </span>
      </div>

      {rows.length === 0 ? (
        <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 12 }}>Nessuna voce in questo periodo</p>
      ) : (
        rows.slice(0, shown).map((l) => {
          const name = nameOf(l);
          const st = statusOf(l);
          const manual = l.actId === BONUS_ACT || l.actId === DEDUCT_ACT;
          const cat = manual ? undefined : CATS.find((c) => c.id === acts.find((a) => a.id === l.actId)?.cat);
          return (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: `1px solid ${P.gb}` }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: P.tx3, fontWeight: 700 }}>{fmtDay(l.date)}</span>
                  <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>
                    {cat?.i} {name}
                    {l.cnt > 1 ? ` ×${l.cnt}` : ""}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 1 }}>
                  <span style={{ fontSize: 10, color: l.pts >= 0 ? P.mint : P.red, fontWeight: 700 }}>
                    {l.pts >= 0 ? "+" : ""}
                    {l.pts}pt
                  </span>
                  <span style={{ fontSize: 9, color: st.color, fontWeight: 600 }}>{st.label}</span>
                  {l.paid && <span style={{ fontSize: 9, color: P.tx3 }}>💸 pagata</span>}
                  {!manual && <span style={{ fontSize: 9, color: P.tx3 }}>{TODS.find((t) => t.k === l.tod)?.l}</span>}
                </div>
                {l.note && <p style={{ color: P.tx3, fontSize: 9, margin: "1px 0 0" }}>{l.note}</p>}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {l.ok && (
                  <Btn small outline color={P.gold} onClick={() => onRevoke(l, name)}>
                    ↩️
                  </Btn>
                )}
                <Btn small outline color={P.red} onClick={() => onDelete(l, name)}>
                  🗑️
                </Btn>
              </div>
            </div>
          );
        })
      )}

      {rows.length > shown && (
        <div style={{ marginTop: 10 }}>
          <Btn full outline color={P.acc} onClick={() => setShown((n) => n + PAGE)}>
            Mostra altre {Math.min(PAGE, rows.length - shown)} · {rows.length - shown} rimaste
          </Btn>
        </div>
      )}
    </GlassCard>
  );
}

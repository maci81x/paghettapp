import { useState } from "react";
import MovementFilters from "../../components/MovementFilters";
import MovementSummary from "../../components/MovementSummary";
import { USER_IDS, fundName } from "../../data/constants";
import type { MovementFilter } from "../../data/movements";
import { emptyFilter, filterMovements, summarize, txRows } from "../../data/movements";
import type { UserId, Users } from "../../data/types";
import { GlassCard, InfoTip, Pill } from "../../design/components";
import { P } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

const STATUS: Record<string, { l: string; c: string } | undefined> = {
  previsto: { l: "⏳ Previsto", c: P.gold },
  effettivo: { l: "✓ Effettivo", c: P.mint },
  da_ricevere: { l: "⏳ Da ricevere", c: P.gold },
};

/** Tutte le transazioni di una ragazza in un solo registro, con i filtri del Wallet. */
export default function AdminTransactionsTab({ users }: { users: Users }) {
  const [uid, setUid] = useState<UserId>("mia");
  const [filter, setFilter] = useState<MovementFilter>(emptyFilter);
  const u = users[uid];
  const moves = filterMovements(u, filter);
  const rows = txRows(moves, u.planned ?? [], filter);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {USER_IDS.map((id) => (
          <Pill
            key={id}
            active={uid === id}
            color={users[id].c}
            onClick={() => {
              setUid(id);
              setFilter(emptyFilter());
            }}
          >
            {users[id].av} {users[id].n}
          </Pill>
        ))}
      </div>

      <GlassCard style={{ padding: 12 }}>
        <MovementFilters u={u} value={filter} onChange={setFilter} />
      </GlassCard>

      <MovementSummary u={u} summary={summarize(moves)} />

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>
          💳 Transazioni di {u.n} ({rows.length})
          <InfoTip text="Entrate (paghette, extra, regali) e spese. Le spese ⏳ previste non hanno ancora toccato il saldo: diventano effettive quando la ragazza indica quanto ha speso." />
        </p>
        {rows.length === 0 && <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10, margin: 0 }}>Nessuna transazione nel periodo.</p>}
        {rows.map((r) => {
          const st = STATUS[r.status];
          return (
            <div key={r.key} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "7px 0", borderTop: `1px solid ${P.gb}` }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ color: P.tx, fontSize: 12, margin: 0 }}>
                  {r.icon} {r.label}
                </p>
                <p style={{ color: P.tx3, fontSize: 9, margin: "1px 0 0" }}>
                  {fmtDay(r.date)}
                  {r.fund && ` · ${fundName(u, r.fund)}`}
                  {st && <span style={{ color: st.c, fontWeight: 700 }}> · {st.l}</span>}
                </p>
              </div>
              <span
                style={{
                  color: r.status === "previsto" ? P.tx3 : r.amount >= 0 ? P.mint : P.red,
                  fontWeight: 700,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                }}
              >
                {r.amount >= 0 ? "+" : "−"}€{Math.abs(r.amount).toFixed(2)}
              </span>
            </div>
          );
        })}
      </GlassCard>
    </div>
  );
}

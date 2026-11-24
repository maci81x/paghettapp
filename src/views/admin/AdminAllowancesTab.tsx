import type { ReactNode } from "react";
import { USER_IDS } from "../../data/constants";
import type { Users, UserId } from "../../data/types";
import { weekLabel } from "../../data/weekBounds";
import { WEEK_STATUS_LABEL, weekStatus } from "../../data/weekStatus";
import { Btn, GlassCard, InfoTip } from "../../design/components";
import { P } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";
import { fmtEuro } from "../../utils/money";

/**
 * Registro delle paghette: in cima le settimane da chiudere, sotto lo storico
 * di ogni ragazza con lo stato di ciascuna settimana (confermata, modificata,
 * ricevuta o ancora da ricevere).
 */
export default function AdminAllowancesTab({ users, toClose, onUndo }: { users: Users; toClose: ReactNode; onUndo: (uid: UserId, week: string) => void }) {
  return (
    <div>
      {toClose}
      {USER_IDS.map((uid) => {
        const u = users[uid];
        const pays = u.pays ?? [];
        return (
          <GlassCard key={uid}>
            <p style={{ color: u.c, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>
              {u.av} {u.n} · paghette registrate
              <InfoTip text="✅ confermata = importo del tier · ✏️ modificata = importo cambiato da te · 💵 pagata fuori app = saldata in contanti, niente nei salvadanai. ↩️ annulla e riporta la settimana fra quelle da chiudere." />
            </p>
            {pays.length === 0 && <p style={{ color: P.tx3, fontSize: 12.5, margin: 0 }}>Ancora nessuna paghetta registrata.</p>}
            {pays.map((p) => {
              const st = weekStatus(p.week, p);
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: `1px solid ${P.gb}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: P.tx, fontSize: 12, fontWeight: 600, margin: 0 }}>
                      {weekLabel(p.week)} · {p.pts} pt
                    </p>
                    <p style={{ color: P.tx3, fontSize: 12, margin: "1px 0 0" }}>
                      {WEEK_STATUS_LABEL[st]}
                      {(st === "modificata" || st === "fuori_app") && p.tier !== undefined && ` (tier ${fmtEuro(p.tier)})`} · registrata il{" "}
                      {fmtDay(p.date)}
                      {st === "fuori_app" ? (
                        " · niente nei salvadanai"
                      ) : (
                        <>
                          {" · "}
                          {p.confirmed ? <span style={{ color: P.mint }}>ricevuta</span> : <span style={{ color: P.gold }}>da ricevere</span>}
                        </>
                      )}
                    </p>
                  </div>
                  <span style={{ color: st === "fuori_app" ? P.tx3 : st === "modificata" ? P.gold : P.mint, fontWeight: 800, fontSize: 13 }}>
                    {st === "fuori_app" ? "💵" : `${fmtEuro(p.amount)}`}
                  </span>
                  <Btn small outline color={P.tx3} onClick={() => onUndo(uid, p.week)}>
                    ↩️
                  </Btn>
                </div>
              );
            })}
          </GlassCard>
        );
      })}
    </div>
  );
}

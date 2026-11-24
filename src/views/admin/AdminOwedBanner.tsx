import type { Arrears } from "../../data/arrears";
import { canNudge } from "../../data/arrears";
import { USER_IDS, isoDate } from "../../data/constants";
import type { UserId, Users } from "../../data/types";
import { P, alpha } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";
import { fmtEuro } from "../../utils/money";

/**
 * Promemoria per papà: quanto deve in tutto per le settimane arretrate, e chi
 * gliel'ha ricordato negli ultimi 7 giorni. Sparisce quando non deve niente.
 */
export default function AdminOwedBanner({ users, owedOf }: { users: Users; owedOf: (uid: UserId) => Arrears }) {
  const rows = USER_IDS.map((uid) => ({ uid, owed: owedOf(uid) })).filter((r) => r.owed.weeks.length > 0);
  if (rows.length === 0) return null;
  const total = rows.reduce((s, r) => s + r.owed.amount, 0);
  const waiting = rows.reduce((s, r) => s + r.owed.waiting, 0);
  // "recente" = la ragazza non può ancora rimandarlo: negli ultimi 7 giorni
  const recent = (iso?: string) => !!iso && !canNudge(iso);

  return (
    <section
      aria-label="Paghette da pagare"
      style={{ padding: 16, borderRadius: 18, marginBottom: 16, background: alpha(P.gold, 12), border: `1.5px solid ${P.gold}` }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: P.gold, letterSpacing: 0.4, textTransform: "uppercase" }}>Paghette da pagare</p>
      <p style={{ margin: "2px 0 0", fontFamily: "'Outfit',sans-serif", fontSize: 34, fontWeight: 900, color: P.tx }}>{fmtEuro(total)}</p>
      <p style={{ margin: "2px 0 0", fontSize: 14, color: P.tx }}>
        {rows.map((r) => `${users[r.uid].n} ${fmtEuro(r.owed.amount)} (${r.owed.weeks.length} sett.)`).join(" · ")}
      </p>
      {waiting > 0 && (
        <p style={{ margin: "4px 0 0", fontSize: 13, color: P.tx2 }}>
          {waiting} attività di quelle settimane aspettano ancora la tua approvazione: approvale prima di pagare.
        </p>
      )}
      {rows
        .filter((r) => recent(users[r.uid].nudgedAt))
        .map((r) => (
          <p key={r.uid} style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: P.tx }}>
            {users[r.uid].n} te l'ha ricordato il {fmtDay(isoDate(new Date(users[r.uid].nudgedAt!)))}
          </p>
        ))}
    </section>
  );
}

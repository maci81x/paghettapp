import type { Arrears } from "../../data/arrears";
import { SPLIT, isoDate } from "../../data/constants";
import { weekLabel } from "../../data/weekBounds";
import { P, alpha } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";
import { fmtEuro } from "../../utils/money";

/**
 * "Papà ti deve": le paghette delle settimane concluse e non ancora pagate.
 * Sta in cima alla Home finché c'è qualcosa da riscuotere; il pulsante manda
 * a papà un promemoria (una volta ogni 7 giorni).
 */
export default function OwedCard({
  owed,
  nudgedAt,
  canNudge,
  nudgeSupported,
  onNudge,
}: {
  owed: Arrears;
  nudgedAt?: string;
  canNudge: boolean;
  nudgeSupported: boolean;
  onNudge: () => void;
}) {
  if (owed.weeks.length === 0) return null;
  const oldest = owed.weeks[owed.weeks.length - 1].week;
  const n = owed.weeks.length;
  const parts = [
    { label: "Personale", value: owed.amount * SPLIT.personale, color: P.mia },
    { label: "Risparmio", value: owed.amount * SPLIT.risparmio, color: P.mint },
    { label: "Beneficenza", value: owed.amount * SPLIT.beneficenza, color: P.gold },
  ];

  return (
    <section
      aria-label="Paghette da riscuotere"
      style={{
        padding: 18,
        borderRadius: 20,
        marginBottom: 18,
        background: alpha(P.mint, 14),
        border: `1.5px solid ${P.mint}`,
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: P.mint, letterSpacing: 0.4, textTransform: "uppercase" }}>Papà ti deve</p>
      <p style={{ margin: "2px 0 0", fontFamily: "'Outfit',sans-serif", fontSize: 42, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.1, color: P.tx }}>
        {fmtEuro(owed.amount)}
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 14, color: P.tx }}>
        {n === 1 ? `La paghetta della settimana ${weekLabel(oldest)}` : `${n} settimane di paghetta, dal ${fmtDay(oldest)}`}
      </p>
      {owed.waiting > 0 && (
        <p style={{ margin: "4px 0 0", fontSize: 13, color: P.tx2 }}>
          {owed.waiting === 1 ? "1 attività aspetta ancora papà" : `${owed.waiting} attività aspettano ancora papà`}
        </p>
      )}

      <div style={{ display: "flex", gap: 14, margin: "14px 0", flexWrap: "wrap" }}>
        {parts.map((p) => (
          <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: P.tx2 }}>
            <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: p.color }} />
            {p.label} <b style={{ color: P.tx }}>{fmtEuro(p.value)}</b>
          </div>
        ))}
      </div>

      {nudgeSupported && (
        <>
          <button
            onClick={onNudge}
            disabled={!canNudge}
            style={{
              width: "100%",
              minHeight: 52,
              border: "none",
              borderRadius: 14,
              background: canNudge ? P.mint : P.track,
              color: canNudge ? P.bg : P.tx2,
              fontSize: 15,
              fontWeight: 800,
              fontFamily: "inherit",
              cursor: canNudge ? "pointer" : "default",
            }}
          >
            {canNudge ? "Ricordalo a papà" : "Promemoria mandato"}
          </button>
          {nudgedAt && (
            <p style={{ margin: "8px 0 0", fontSize: 12.5, color: P.tx2, textAlign: "center" }}>
              {canNudge ? `Ultimo promemoria il ${fmtDay(isoDate(new Date(nudgedAt)))}` : `Gliel'hai ricordato il ${fmtDay(isoDate(new Date(nudgedAt)))}. Puoi rifarlo dopo 7 giorni.`}
            </p>
          )}
        </>
      )}
    </section>
  );
}

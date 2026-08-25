import { TIERS, TIER_TICK, nextTier as nextTierOf, tierPos } from "../data/constants";
import { P, alpha } from "../design/tokens";

/**
 * I quattro traguardi della paghetta su una riga sola: dove si è adesso e
 * quanto manca al prossimo. Le tacche sono equidistanti, non in scala coi
 * punti, perché 0→250 e 250→350 non sono passi uguali e una scala lineare
 * schiaccerebbe gli ultimi due traguardi uno sull'altro.
 */
export default function TierBar({
  wp,
  color,
  grad,
  compact,
}: {
  /** Punti della settimana. */
  wp: number;
  /** Tinta piatta della figlia, per le tacche raggiunte. */
  color: string;
  /** Gradiente della figlia, per il riempimento. */
  grad: string;
  /** Versione stretta, per le card affiancate della dashboard admin. */
  compact?: boolean;
}) {
  const next = nextTierOf(wp);
  const pos = tierPos(wp);
  const side = compact ? 14 : 22;
  const dot = compact ? 9 : 12;
  const cursor = compact ? 11 : 14;
  const barH = compact ? 5 : 6;
  // il centro della barra è il riferimento verticale di tacche e cursore
  const mid = Math.max(dot, cursor) / 2 + 2;

  return (
    <div style={{ minHeight: compact ? 46 : 60 }}>
      <div style={{ padding: `0 ${side}px` }}>
        <div style={{ position: "relative", height: mid * 2 }}>
          <div style={{ position: "absolute", top: mid - barH / 2, left: 0, right: 0, height: barH, borderRadius: barH / 2, background: P.track }} />
          <div
            style={{
              position: "absolute",
              top: mid - barH / 2,
              left: 0,
              width: `${pos}%`,
              height: barH,
              borderRadius: barH / 2,
              background: grad,
              transition: "width .6s",
            }}
          />
          {TIERS.map((t, i) => (
            <div
              key={t.r}
              style={{
                position: "absolute",
                top: mid - dot / 2 - 2,
                left: `${i * TIER_TICK}%`,
                transform: "translateX(-50%)",
                boxSizing: "content-box",
                width: dot,
                height: dot,
                borderRadius: dot,
                background: wp >= t.min ? color : P.track,
                border: `2px solid ${P.bg}`,
                transition: "background .3s",
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              top: mid - cursor / 2 - 3,
              left: `${pos}%`,
              transform: "translateX(-50%)",
              boxSizing: "content-box",
              width: cursor,
              height: cursor,
              borderRadius: cursor,
              background: grad,
              border: `3px solid ${P.bg}`,
              boxShadow: `0 0 10px ${alpha(color, 55)}`,
              transition: "left .6s",
            }}
          />
        </div>

        <div style={{ position: "relative", height: compact ? 22 : 26, marginTop: 5 }}>
          {TIERS.map((t, i) => (
            <div
              key={t.r}
              style={{ position: "absolute", left: `${i * TIER_TICK}%`, transform: "translateX(-50%)", width: compact ? 40 : 44, textAlign: "center" }}
            >
              <p style={{ margin: 0, fontSize: compact ? 10 : 12, fontWeight: 800, color: wp >= t.min ? P.tx : P.tx3 }}>€{t.r}</p>
              <p style={{ margin: 0, fontSize: 8, color: P.tx3 }}>{t.min}pt</p>
            </div>
          ))}
        </div>
      </div>

      <p style={{ margin: 0, textAlign: "center", fontSize: compact ? 9 : 10, color: P.tx2 }}>
        {next ? (
          <>
            Sei a <b style={{ color: P.tx }}>{wp}pt</b> • Mancano <b style={{ color }}>{next.min - wp}pt</b> per €{next.r}
          </>
        ) : (
          "🏆 Sei al massimo!"
        )}
      </p>
    </div>
  );
}

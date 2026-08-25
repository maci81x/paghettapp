import { useEffect, useState } from "react";
import { USER_IDS } from "../../data/constants";
import type { Range } from "../../data/movements";
import { RANGES, summaryOf, summaryText } from "../../data/movements";
import type { Users } from "../../data/types";
import { Btn, GlassCard, Pill } from "../../design/components";
import { P, alpha } from "../../design/tokens";

const eur = (n: number) => `€${n.toFixed(2)}`;

/**
 * Entrate, uscite e saldo delle due figlie affiancati, sul periodo scelto
 * qui: la scheda della singola figlia ha il suo filtro, questo è il colpo
 * d'occhio da cui l'admin parte.
 */
export default function AdminComparisonCard({ users }: { users: Users }) {
  const [range, setRange] = useState<Range>("month");
  const [copied, setCopied] = useState<"ok" | "err" | null>(null);

  const rows = USER_IDS.map((uid) => ({ uid, u: users[uid], summary: summaryOf(users[uid], { range, kinds: [], funds: [], confirmed: "all" }) }));

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    const text = summaryText(range, rows.map((r) => ({ name: r.u.n, summary: r.summary })));
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      // clipboard negata (contesto non sicuro o permesso rifiutato)
      setCopied("err");
    }
  };

  return (
    <GlassCard style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>📊 Confronto periodo</p>
        <Btn small outline color={copied === "err" ? P.red : P.acc} onClick={copy}>
          {copied === "ok" ? "✅ Copiato" : copied === "err" ? "✕ Non riuscito" : "📋 Copia riepilogo"}
        </Btn>
      </div>

      <div style={{ display: "flex", gap: 3, overflowX: "auto", paddingBottom: 3, marginBottom: 8 }}>
        {RANGES.map((r) => (
          <Pill key={r.k} active={range === r.k} onClick={() => setRange(r.k)} color={P.acc} s>
            {r.l}
          </Pill>
        ))}
      </div>

      {rows.map(({ uid, u, summary }) => {
        const positive = summary.balance >= 0;
        return (
          <div key={uid} style={{ padding: "7px 0", borderBottom: `1px solid ${P.gb}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ color: u.c, fontSize: 12, fontWeight: 800 }}>{u.n}</span>
              <span style={{ color: positive ? P.mint : P.red, fontSize: 13, fontWeight: 800 }}>{eur(summary.balance)}</span>
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
              <span style={{ color: P.tx3 }}>
                entrate <b style={{ color: P.mint }}>{eur(summary.totalIn)}</b>
              </span>
              <span style={{ color: P.tx3 }}>
                uscite <b style={{ color: P.red }}>{eur(summary.totalOut)}</b>
              </span>
              <span style={{ color: P.tx3 }}>{summary.count} mov.</span>
            </div>
          </div>
        );
      })}

      {copied === "err" && (
        <p style={{ color: P.tx3, fontSize: 9, margin: "6px 0 0", lineHeight: 1.4, background: alpha(P.red, 6), borderRadius: 8, padding: 6 }}>
          Il browser ha negato l'accesso agli appunti. Succede fuori da HTTPS o se il permesso è bloccato.
        </p>
      )}
    </GlassCard>
  );
}

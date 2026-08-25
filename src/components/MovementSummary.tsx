import { useEffect, useState } from "react";
import { FUNDS, fundName } from "../data/constants";
import type { Summary } from "../data/movements";
import { INCOME_KINDS } from "../data/movements";
import type { User } from "../data/types";
import { GlassCard } from "../design/components";
import { P, alpha } from "../design/tokens";

const KEY = "paghettapp:summaryOpen";

/** Stato aperto/chiuso ricordato fra una sessione e l'altra, aperto la prima volta. */
const initialOpen = () => {
  try {
    return localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
};

const eur = (n: number) => `€${n.toFixed(2)}`;

export default function MovementSummary({ u, summary }: { u: User; summary: Summary }) {
  const [open, setOpen] = useState(initialOpen);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, open ? "1" : "0");
    } catch {
      // storage non disponibile: lo stato vale per questa sessione
    }
  }, [open]);

  const positive = summary.balance >= 0;

  return (
    <GlassCard style={{ padding: 12 }}>
      <div onClick={() => setOpen((v) => !v)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>📊 Riepilogo periodo</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: positive ? P.mint : P.red, fontSize: 14, fontWeight: 800 }}>{eur(summary.balance)}</span>
          <span style={{ color: P.tx3, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 10 }}>
          <p style={{ color: P.tx, fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>
            💰 Totale entrate: <span style={{ color: P.mint }}>{eur(summary.totalIn)}</span>
          </p>
          {INCOME_KINDS.map(({ k, l, icon }) => {
            const slot = summary.byKind[k];
            return (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0 2px 10px", fontSize: 11 }}>
                <span style={{ color: slot.count > 0 ? P.tx2 : P.tx3 }}>
                  {icon} {l}
                </span>
                <span style={{ color: slot.count > 0 ? P.mint : P.tx3, fontWeight: 600 }}>
                  {eur(slot.total)} <span style={{ color: P.tx3, fontWeight: 400 }}>({slot.count})</span>
                </span>
              </div>
            );
          })}

          <p style={{ color: P.tx, fontSize: 12, fontWeight: 700, margin: "8px 0 4px" }}>
            💸 Totale uscite: <span style={{ color: P.red }}>{eur(summary.totalOut)}</span>
          </p>
          {FUNDS.map((f) => {
            const slot = summary.byFund[f];
            if (slot.count === 0) return null;
            return (
              <div key={f} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0 2px 10px", fontSize: 11 }}>
                <span style={{ color: P.tx2 }}>{fundName(u, f)}</span>
                <span style={{ color: P.red, fontWeight: 600 }}>
                  {eur(slot.total)} <span style={{ color: P.tx3, fontWeight: 400 }}>({slot.count})</span>
                </span>
              </div>
            );
          })}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              paddingTop: 8,
              borderTop: `1px solid ${P.gb}`,
              background: alpha(positive ? P.mint : P.red, 5),
              borderRadius: 8,
              padding: "8px 8px 6px",
            }}
          >
            <span style={{ color: P.tx, fontSize: 12, fontWeight: 700 }}>📊 Saldo periodo</span>
            <span style={{ color: positive ? P.mint : P.red, fontSize: 16, fontWeight: 800 }}>{eur(summary.balance)}</span>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

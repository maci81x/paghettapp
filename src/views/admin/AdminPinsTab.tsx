import type { PinKey } from "../../data/types";
import { Btn, GlassCard } from "../../design/components";
import { P } from "../../design/tokens";

const ROWS: { k: PinKey; l: string }[] = [
  { k: "mia", l: "Mia" },
  { k: "samira", l: "Samira" },
  { k: "admin", l: "Admin" },
];

export default function AdminPinsTab({ onChange, onReset }: { onChange: (k: PinKey) => void; onReset: (k: PinKey) => void }) {
  return (
    <div>
      {ROWS.map((x) => (
        <GlassCard key={x.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ color: P.tx, fontWeight: 700, fontSize: 12, margin: 0 }}>{x.l}</p>
            <p style={{ color: P.tx3, fontSize: 11, margin: 0, letterSpacing: 5 }}>••••</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small color={P.blue} onClick={() => onChange(x.k)}>
              Cambia
            </Btn>
            <Btn small color={P.gold} onClick={() => onReset(x.k)}>
              Reset
            </Btn>
          </div>
        </GlassCard>
      ))}
      <p style={{ color: P.tx3, fontSize: 10, textAlign: "center", marginTop: 4 }}>Reset riporta il PIN a quello di fabbrica.</p>
    </div>
  );
}

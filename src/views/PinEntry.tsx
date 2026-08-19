import type { PinKey, Users } from "../data/types";
import { P, gls, screen } from "../design/tokens";

const KEYS: (number | "⌫" | null)[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "⌫"];

export default function PinEntry({
  target,
  users,
  pin,
  err,
  onPress,
  onDelete,
  onBack,
}: {
  target: PinKey;
  users: Users;
  pin: string;
  err: boolean;
  onPress: (d: string) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const tgt =
    target === "admin"
      ? { n: "Admin", c: P.acc, av: "🔒", grad: P.accG }
      : { n: users[target].n, c: users[target].c, av: users[target].av, grad: users[target].grad };

  return (
    <div style={{ ...screen, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, position: "relative" }}>
      <button onClick={onBack} style={{ position: "absolute", top: 16, left: 16, background: "none", border: "none", color: P.tx3, fontSize: 20, cursor: "pointer" }}>
        ‹
      </button>
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: tgt.grad,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          marginBottom: 10,
          boxShadow: `0 6px 20px ${tgt.c}33`,
        }}
      >
        {tgt.av}
      </div>
      <h2 style={{ color: P.tx, fontSize: 16, fontWeight: 700, margin: "0 0 2px" }}>{tgt.n}</h2>
      <p style={{ color: P.tx3, fontSize: 11, marginBottom: 24 }}>Inserisci il PIN</p>
      <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: "50%",
              background: i < pin.length ? (err ? P.red : tgt.c) : "transparent",
              border: `2px solid ${err ? P.red : tgt.c}`,
              transition: "all .15s",
              transform: err ? `translateX(${i % 2 ? 3 : -3}px)` : "none",
              boxShadow: i < pin.length ? `0 0 10px ${err ? P.red : tgt.c}33` : "none",
            }}
          />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, maxWidth: 220 }}>
        {KEYS.map((d, i) => (
          <button
            key={i}
            onClick={() => {
              if (d === null) return;
              if (d === "⌫") onDelete();
              else onPress(String(d));
            }}
            style={{
              width: 60,
              height: 48,
              borderRadius: 12,
              ...(d !== null ? gls : { background: "transparent", border: "none" }),
              color: P.tx,
              fontSize: d === "⌫" ? 16 : 20,
              fontWeight: 600,
              cursor: d === null ? "default" : "pointer",
            }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { enablePush, pushState } from "../data/push";
import { P } from "../design/tokens";

/**
 * "Attiva le notifiche su questo telefono". Sparisce quando sono già attive;
 * se il telefono non le supporta spiega cosa fare (su iPhone: app nella Home).
 */
export default function PushToggle({ userId, text }: { userId: string; text: string }) {
  const [state, setState] = useState(pushState);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (state === "granted" && !msg) return null;

  const on = async () => {
    setBusy(true);
    const err = await enablePush(userId);
    setBusy(false);
    setState(pushState());
    setMsg(err ?? "Notifiche attive su questo telefono.");
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", marginBottom: 12, borderTop: `1px solid ${P.gb}`, borderBottom: `1px solid ${P.gb}` }}>
      <p style={{ flex: 1, margin: 0, fontSize: 14, color: P.tx2, lineHeight: 1.4 }}>{msg ?? text}</p>
      {state !== "granted" && state !== "unsupported" && state !== "denied" && (
        <button
          onClick={on}
          disabled={busy}
          style={{ minHeight: 44, padding: "0 16px", border: "none", borderRadius: 12, background: P.acc, color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit", cursor: "pointer" }}
        >
          {busy ? "Attendi…" : "Attiva"}
        </button>
      )}
    </div>
  );
}

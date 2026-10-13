import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { fetchLogPhoto } from "../data/api";
import { Btn, Modal } from "../design/components";
import { P, alpha } from "../design/tokens";

/**
 * Le foto-prova non arrivano col caricamento iniziale: si leggono una per
 * una quando qualcuno le guarda, e restano qui per tutta la sessione.
 */
const cache = new Map<number, string | null>();
const inflight = new Map<number, Promise<string | null>>();

const loadPhoto = (logId: number): Promise<string | null> => {
  if (cache.has(logId)) return Promise.resolve(cache.get(logId) ?? null);
  let p = inflight.get(logId);
  if (!p) {
    p = fetchLogPhoto(logId).then((res) => {
      // un errore di rete non si memorizza: al prossimo sguardo si riprova
      if (!res.error) cache.set(logId, res.data);
      inflight.delete(logId);
      return res.data;
    });
    inflight.set(logId, p);
  }
  return p;
};

function useLogPhoto(logId: number): string | null | undefined {
  // la cache si legge durante il render; lo stato serve solo a ridisegnare quando arriva la foto
  const [loaded, setLoaded] = useState<{ id: number; src: string | null } | null>(null);
  useEffect(() => {
    if (cache.has(logId)) return;
    let alive = true;
    void loadPhoto(logId).then((src) => alive && setLoaded({ id: logId, src }));
    return () => {
      alive = false;
    };
  }, [logId]);
  if (cache.has(logId)) return cache.get(logId);
  return loaded?.id === logId ? loaded.src : undefined;
}

/** Miniatura quadrata; `undefined` mentre carica, un segnaposto se la foto non c'è più. */
export function LogPhotoThumb({ logId, size = 56, onClick }: { logId: number; size?: number | "100%"; onClick?: () => void }) {
  const src = useLogPhoto(logId);
  return (
    <button
      onClick={onClick}
      aria-label="Apri la foto-prova"
      style={{
        width: size,
        aspectRatio: "1",
        flexShrink: 0,
        borderRadius: 10,
        border: `1px solid ${P.gb}`,
        background: src ? `center / cover no-repeat url("${src}")` : alpha(P.tx3, 12),
        color: P.tx3,
        fontSize: size === "100%" ? 22 : 14,
        cursor: onClick ? "pointer" : "default",
        padding: 0,
      }}
    >
      {src === undefined ? "…" : src ? "" : "📷"}
    </button>
  );
}

/** Foto a tutto schermo, con eventuali azioni sotto (approva/rifiuta). */
export function PhotoViewer({ logId, title, onClose, actions }: { logId: number; title: string; onClose: () => void; actions?: ReactNode }) {
  const src = useLogPhoto(logId);
  return (
    <Modal onClose={onClose}>
      <p style={{ color: P.tx, fontWeight: 700, fontSize: 14, margin: "0 0 10px" }}>📸 {title}</p>
      {src === undefined ? (
        <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 30 }}>Carico la foto…</p>
      ) : src ? (
        <img src={src} alt={title} style={{ width: "100%", borderRadius: 12, display: "block", marginBottom: 12 }} />
      ) : (
        <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 30 }}>Foto non disponibile.</p>
      )}
      {actions ?? (
        <Btn full color={P.tx3} onClick={onClose}>
          Chiudi
        </Btn>
      )}
    </Modal>
  );
}

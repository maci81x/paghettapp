import { useState } from "react";
import { LogPhotoThumb, PhotoViewer } from "../../components/LogPhoto";
import type { LogEntry } from "../../data/types";
import { GlassCard, InfoTip } from "../../design/components";
import { P } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

/** Le foto-prova approvate: restano nel profilo come ricordo di quello che si è fatto. */
export default function PhotoGalleryCard({ log }: { log: LogEntry[] }) {
  const [open, setOpen] = useState<LogEntry | null>(null);
  const shots = log.filter((l) => l.photo && l.ok && !l.revoked).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (shots.length === 0) return null;
  return (
    <GlassCard>
      <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>
        📸 Le mie foto-prova <InfoTip text="Le foto delle attività che l'admin ha approvato." />
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {shots.slice(0, 12).map((l) => (
          <LogPhotoThumb key={l.id} logId={l.id} size="100%" onClick={() => setOpen(l)} />
        ))}
      </div>
      {open && <PhotoViewer logId={open.id} title={fmtDay(open.date)} onClose={() => setOpen(null)} />}
    </GlassCard>
  );
}

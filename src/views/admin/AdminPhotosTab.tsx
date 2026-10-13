import { useState } from "react";
import { LogPhotoThumb, PhotoViewer } from "../../components/LogPhoto";
import { USER_IDS } from "../../data/constants";
import type { Activity, LogEntry, UserId, Users } from "../../data/types";
import { Btn, GlassCard, InfoTip, Pill } from "../../design/components";
import { P } from "../../design/tokens";
import { fmtDay } from "../../utils/dates";

interface Shot {
  uid: UserId;
  l: LogEntry;
  name: string;
}

/**
 * Le foto-prova allegate alle attività. Quelle in attesa si approvano o
 * rifiutano direttamente da qui; quelle approvate restano come galleria.
 */
export default function AdminPhotosTab({
  users,
  acts,
  supported,
  onApprove,
  onReject,
}: {
  users: Users;
  acts: Activity[];
  /** false finché la migrazione `log_photos` non è applicata. */
  supported: boolean;
  onApprove: (uid: UserId, logId: number) => void;
  onReject: (uid: UserId, logId: number) => void;
}) {
  const [onlyPending, setOnlyPending] = useState(true);
  const [viewing, setViewing] = useState<Shot | null>(null);

  if (!supported) {
    return (
      <GlassCard>
        <p style={{ color: P.gold, fontSize: 12, fontWeight: 700, margin: "0 0 4px" }}>📸 Foto-prova non ancora attive</p>
        <p style={{ color: P.tx3, fontSize: 11, margin: 0, lineHeight: 1.5 }}>
          Esegui la migrazione <b>20261013_log_photos.sql</b> nella SQL Editor di Supabase: da quel momento le ragazze potranno allegare una foto alle attività.
        </p>
      </GlassCard>
    );
  }

  const shots: Shot[] = USER_IDS.flatMap((uid) =>
    users[uid].log
      .filter((l) => l.photo && !l.revoked && (!onlyPending || !l.ok))
      .map((l) => ({ uid, l, name: acts.find((a) => a.id === l.actId)?.name ?? "Attività" })),
  ).sort((a, b) => b.l.date.localeCompare(a.l.date) || b.l.id - a.l.id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <Pill active={onlyPending} onClick={() => setOnlyPending(true)} color={P.gold}>
          ⏳ Da verificare
        </Pill>
        <Pill active={!onlyPending} onClick={() => setOnlyPending(false)} color={P.acc}>
          🖼️ Tutte
        </Pill>
        <InfoTip text="Tocca una foto per vederla grande. Approvare dà i punti dell'attività; rifiutare cancella l'attività insieme alla foto." />
      </div>

      {shots.length === 0 ? (
        <GlassCard>
          <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 12, margin: 0 }}>
            {onlyPending ? "Nessuna foto da verificare 🎉" : "Ancora nessuna foto-prova."}
          </p>
        </GlassCard>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {shots.map((sh) => (
            <div key={sh.l.id} style={{ minWidth: 0 }}>
              <div style={{ position: "relative" }}>
                <LogPhotoThumb logId={sh.l.id} size="100%" onClick={() => setViewing(sh)} />
                <span style={{ position: "absolute", top: 4, left: 4, fontSize: 13 }}>{users[sh.uid].av}</span>
                {sh.l.ok && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 12 }}>✅</span>}
              </div>
              <p style={{ color: P.tx, fontSize: 10, fontWeight: 600, margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sh.name}
              </p>
              <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                {users[sh.uid].n} · {fmtDay(sh.l.date)}
              </p>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <PhotoViewer
          logId={viewing.l.id}
          title={`${users[viewing.uid].n} · ${viewing.name} · ${fmtDay(viewing.l.date)}`}
          onClose={() => setViewing(null)}
          actions={
            viewing.l.ok ? undefined : (
              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  style={{ flex: 1, minHeight: 48 }}
                  grad={P.mintG}
                  onClick={() => {
                    onApprove(viewing.uid, viewing.l.id);
                    setViewing(null);
                  }}
                >
                  ✓ Approva +{viewing.l.pts}pt
                </Btn>
                <Btn
                  style={{ flex: 1, minHeight: 48 }}
                  color={P.red}
                  onClick={() => {
                    onReject(viewing.uid, viewing.l.id);
                    setViewing(null);
                  }}
                >
                  ✗ Rifiuta
                </Btn>
              </div>
            )
          }
        />
      )}
    </div>
  );
}

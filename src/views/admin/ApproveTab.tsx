import { TODS, USER_IDS } from "../../data/constants";
import type { Activity, LogEntry, UserId, Users } from "../../data/types";
import { Btn, GlassCard } from "../../design/components";
import { P, alpha } from "../../design/tokens";
import { useSelection } from "../../hooks/useSelection";

interface Pending {
  id: number;
  uid: UserId;
  l: LogEntry;
  a: Activity;
}

export default function ApproveTab({
  users,
  acts,
  onApprove,
  onReject,
  onApproveMany,
  onRejectMany,
}: {
  users: Users;
  acts: Activity[];
  onApprove: (uid: UserId, logId: number) => void;
  onReject: (uid: UserId, logId: number) => void;
  onApproveMany: (picks: { uid: UserId; logId: number }[]) => void;
  /** Chiede conferma e rifiuta: false se l'admin annulla. Il rifiuto cancella le voci. */
  onRejectMany: (picks: { uid: UserId; logId: number }[]) => boolean;
}) {
  const pending: Pending[] = USER_IDS.flatMap((uid) =>
    users[uid].log
      .filter((l) => !l.ok && !l.revoked)
      .map((l) => ({ id: l.id, uid, l, a: acts.find((x) => x.id === l.actId) })),
  ).filter((x): x is Pending => !!x.a);

  const s = useSelection(pending);

  /** Dagli id selezionati alle coppie figlia+voce che servono alle scritture. */
  const picksOf = (ids: number[]) => pending.filter((p) => ids.includes(p.id)).map((p) => ({ uid: p.uid, logId: p.l.id }));

  const selectedPts = pending.filter((p) => s.isPicked(p.id)).reduce((acc, p) => acc + p.l.pts, 0);

  if (pending.length === 0) {
    return (
      <GlassCard>
        <p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 16 }}>Nessuna attività da approvare 🎉</p>
      </GlassCard>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>
          {s.selecting ? `${s.count} selezionate · +${selectedPts}pt` : `${pending.length} in attesa`}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {s.selecting ? (
            <>
              <Btn small outline color={P.blue} onClick={s.toggleAll}>
                {s.allSelected ? "Deseleziona tutte" : "Seleziona tutte"}
              </Btn>
              <Btn small outline color={P.tx3} onClick={s.exit}>
                Annulla
              </Btn>
            </>
          ) : (
            <Btn small outline color={P.mint} onClick={s.start}>
              ☑️ Seleziona
            </Btn>
          )}
        </div>
      </div>

      {pending.map((p) => {
        const checked = s.isPicked(p.id);
        return (
          <GlassCard
            key={p.id}
            onClick={s.selecting ? () => s.toggle(p.id) : undefined}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              cursor: s.selecting ? "pointer" : undefined,
              border: s.selecting && checked ? `1px solid ${alpha(P.mint, 40)}` : undefined,
              background: s.selecting && checked ? alpha(P.mint, 7) : undefined,
            }}
          >
            {s.selecting && (
              <input
                type="checkbox"
                checked={checked}
                onChange={() => s.toggle(p.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 17, height: 17, accentColor: P.mint, flexShrink: 0, cursor: "pointer" }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    background: users[p.uid].grad,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {users[p.uid].av}
                </div>
                <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>
                  {p.a.name} ×{p.l.cnt}
                </span>
              </div>
              <p style={{ color: P.tx3, fontSize: 10, margin: "2px 0 0 28px" }}>
                {TODS.find((t) => t.k === p.l.tod)?.l} {p.l.note && `· ${p.l.note}`}
              </p>
              <span style={{ fontSize: 10, color: P.mint, marginLeft: 28 }}>+{p.l.pts}pt</span>
            </div>
            {!s.selecting && (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <Btn small grad={P.mintG} onClick={() => onApprove(p.uid, p.l.id)}>
                  ✓
                </Btn>
                <Btn small color={P.red} onClick={() => onReject(p.uid, p.l.id)}>
                  ✗
                </Btn>
              </div>
            )}
          </GlassCard>
        );
      })}

      {s.selecting && (
        <div style={{ position: "sticky", bottom: 8, marginTop: 12, display: "flex", gap: 8 }}>
          <Btn style={{ flex: 1 }} grad={P.mintG} disabled={s.count === 0} onClick={() => s.runOnSelection((ids) => onApproveMany(picksOf(ids)))}>
            ✅ Approva ({s.count})
          </Btn>
          <Btn style={{ flex: 1 }} color={P.red} disabled={s.count === 0} onClick={() => s.runOnSelection((ids) => onRejectMany(picksOf(ids)))}>
            ❌ Rifiuta ({s.count})
          </Btn>
        </div>
      )}
    </div>
  );
}

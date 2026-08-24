import { useState } from "react";
import { CATS, FREQ_UNIT } from "../../data/constants";
import type { Activity } from "../../data/types";
import { Btn, GlassCard } from "../../design/components";
import { P } from "../../design/tokens";

export default function AdminActivitiesTab({
  acts,
  onNew,
  onEdit,
  onDelete,
  onDeleteMany,
}: {
  acts: Activity[];
  onNew: () => void;
  onEdit: (a: Activity) => void;
  onDelete: (a: Activity) => void;
  /** Chiede conferma ed elimina: true se l'eliminazione è avvenuta. */
  onDeleteMany: (ids: number[]) => boolean;
}) {
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<number[]>([]);

  const allSelected = acts.length > 0 && sel.length === acts.length;

  const exit = () => {
    setSelecting(false);
    setSel([]);
  };

  const toggle = (id: number) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const toggleAll = () => setSel(allSelected ? [] : acts.map((a) => a.id));

  const removeSelected = () => {
    if (sel.length === 0) return;
    if (onDeleteMany(sel)) exit();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>
          {selecting ? `${sel.length} selezionate` : `${acts.length} attività`}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {selecting ? (
            <>
              <Btn small outline color={P.blue} onClick={toggleAll}>
                {allSelected ? "Deseleziona tutte" : "Seleziona tutte"}
              </Btn>
              <Btn small outline color={P.tx3} onClick={exit}>
                Annulla
              </Btn>
            </>
          ) : (
            <>
              <Btn small outline color={P.red} onClick={() => setSelecting(true)} disabled={acts.length === 0}>
                🗑️ Seleziona
              </Btn>
              <Btn small grad={P.accG} onClick={onNew}>
                + Nuova
              </Btn>
            </>
          )}
        </div>
      </div>

      {acts.map((a) => {
        const cat = CATS.find((c) => c.id === a.cat);
        const checked = sel.includes(a.id);
        return (
          <GlassCard
            key={a.id}
            onClick={selecting ? () => toggle(a.id) : undefined}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              padding: 12,
              cursor: selecting ? "pointer" : undefined,
              border: selecting && checked ? `1px solid ${P.red}66` : undefined,
              background: selecting && checked ? P.red + "12" : undefined,
            }}
          >
            {selecting && (
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(a.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 17, height: 17, accentColor: P.red, flexShrink: 0, cursor: "pointer" }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 13 }}>{cat?.i}</span>
                <span style={{ color: P.tx, fontSize: 12, fontWeight: 600 }}>{a.name}</span>
                {a.ch ? <span style={{ background: P.gold + "22", color: P.gold, padding: "1px 5px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>⚡</span> : null}
              </div>
              <span style={{ fontSize: 10, color: P.tx3 }}>
                +{a.pts}pt {a.pen ? `/ ${a.pen}pt` : ""} · max ×{a.max}/{FREQ_UNIT[a.freq]}
                {a.duration ? ` · ⏱ ${a.duration}min` : ""}
              </span>
            </div>
            {!selecting && (
              <div style={{ display: "flex", gap: 4 }}>
                <Btn small color={P.blue} onClick={() => onEdit(a)}>
                  ✏️
                </Btn>
                <Btn small color={P.red} onClick={() => onDelete(a)}>
                  🗑
                </Btn>
              </div>
            )}
          </GlassCard>
        );
      })}

      {selecting && (
        <div style={{ position: "sticky", bottom: 8, marginTop: 12 }}>
          <Btn full color={P.red} onClick={removeSelected} disabled={sel.length === 0}>
            🗑️ Elimina selezionate ({sel.length})
          </Btn>
        </div>
      )}
    </div>
  );
}

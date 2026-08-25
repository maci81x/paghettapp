import { useState } from "react";
import { CATS, FREQ_UNIT, byFreqThenPenalty } from "../../data/constants";
import type { Activity } from "../../data/types";
import { Btn, GlassCard, Pill } from "../../design/components";
import { P, alpha } from "../../design/tokens";

const hasPen = (a: Activity) => a.pen < 0;

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
  const [onlyPen, setOnlyPen] = useState(false);

  const penalties = acts.filter(hasPen).sort((a, b) => a.pen - b.pen);
  // la card in cima parte aperta solo quando c'è davvero qualcosa da guardare
  const [openPen, setOpenPen] = useState(penalties.length > 0);

  // frequenza come chiave principale, penalità più pesante come secondaria
  const shown = acts
    .filter((a) => !onlyPen || hasPen(a))
    .slice()
    .sort(byFreqThenPenalty);

  const allSelected = shown.length > 0 && shown.every((a) => sel.includes(a.id));

  const exit = () => {
    setSelecting(false);
    setSel([]);
  };

  const toggle = (id: number) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // "tutte" vuol dire quelle che si vedono: con un filtro attivo il resto non si tocca
  const toggleAll = () => setSel(allSelected ? [] : shown.map((a) => a.id));

  const removeSelected = () => {
    if (sel.length === 0) return;
    if (onDeleteMany(sel)) exit();
  };

  return (
    <div>
      <GlassCard
        style={{
          background: penalties.length > 0 ? `linear-gradient(135deg,${alpha(P.gold, 8)},transparent)` : undefined,
          border: penalties.length > 0 ? `1.5px solid ${alpha(P.gold, 22)}` : undefined,
          padding: 12,
        }}
      >
        <div
          onClick={() => setOpenPen((v) => !v)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        >
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>⚠️ Attività con penalità</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: alpha(P.gold, 13), color: P.gold, borderRadius: 8, padding: "2px 8px", fontSize: 10, fontWeight: 800 }}>
              {penalties.length}
            </span>
            <span style={{ color: P.tx3, fontSize: 11 }}>{openPen ? "▲" : "▼"}</span>
          </div>
        </div>
        {openPen &&
          (penalties.length === 0 ? (
            <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: "10px 0 2px", margin: 0 }}>Nessuna attività con penalità</p>
          ) : (
            <div style={{ marginTop: 8 }}>
              {penalties.map((a) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 11 }}>
                  <span style={{ color: P.tx }}>
                    {CATS.find((c) => c.id === a.cat)?.i} {a.name}
                  </span>
                  <span style={{ color: P.gold, fontWeight: 800 }}>{a.pen}pt</span>
                </div>
              ))}
            </div>
          ))}
      </GlassCard>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>{selecting ? `${sel.length} selezionate` : `${shown.length} attività`}</span>
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
              <Btn small outline color={P.red} onClick={() => setSelecting(true)} disabled={shown.length === 0}>
                🗑️ Seleziona
              </Btn>
              <Btn small grad={P.accG} onClick={onNew}>
                + Nuova
              </Btn>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
        <Pill active={!onlyPen} onClick={() => setOnlyPen(false)} color={P.acc} s>
          Tutte
        </Pill>
        <Pill active={onlyPen} onClick={() => setOnlyPen(true)} color={P.gold} s>
          ⚠️ Solo con penalità
        </Pill>
      </div>

      {shown.map((a) => {
        const cat = CATS.find((c) => c.id === a.cat);
        const checked = sel.includes(a.id);
        const pen = hasPen(a);
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
              border: selecting && checked ? `1px solid ${alpha(P.red, 40)}` : pen ? `1px solid ${alpha(P.gold, 22)}` : undefined,
              background: selecting && checked ? alpha(P.red, 7) : pen ? alpha(P.gold, 4) : undefined,
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
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13 }}>{cat?.i}</span>
                <span style={{ color: pen ? P.gold : P.tx, fontSize: 12, fontWeight: 600 }}>
                  {pen ? "⚠️ " : ""}
                  {a.name}
                </span>
                {pen && (
                  <span style={{ background: alpha(P.gold, 13), color: P.gold, padding: "1px 5px", borderRadius: 5, fontSize: 9, fontWeight: 800 }}>
                    {a.pen}pt
                  </span>
                )}
                {a.ch ? <span style={{ background: alpha(P.gold, 13), color: P.gold, padding: "1px 5px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>⚡</span> : null}
              </div>
              <span style={{ fontSize: 10, color: P.tx3 }}>
                +{a.pts}pt · max ×{a.max}/{FREQ_UNIT[a.freq]}
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

      {shown.length === 0 && <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 16 }}>Nessuna attività con penalità</p>}

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

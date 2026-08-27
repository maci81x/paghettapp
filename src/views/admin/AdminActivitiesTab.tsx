import { useState } from "react";
import { CATS, FREQ_UNIT, actIcon, byFreqThenPenalty } from "../../data/constants";
import type { Activity } from "../../data/types";
import { Btn, GlassCard, Pill } from "../../design/components";
import { P, alpha } from "../../design/tokens";
import { useSelection } from "../../hooks/useSelection";

const hasPen = (a: Activity) => a.pen < 0;

type Filter = "all" | "visible" | "hidden" | "penalty";

const FILTERS: { k: Filter; l: string; c: string }[] = [
  { k: "all", l: "Tutte", c: P.acc },
  { k: "visible", l: "👁️ Visibili", c: P.acc },
  { k: "hidden", l: "🙈 Nascoste", c: P.tx3 },
  { k: "penalty", l: "⚠️ Solo con penalità", c: P.gold },
];

const matches = (a: Activity, f: Filter) => {
  switch (f) {
    case "visible":
      return !a.hidden;
    case "hidden":
      return !!a.hidden;
    case "penalty":
      return hasPen(a);
    case "all":
      return true;
  }
};

export default function AdminActivitiesTab({
  acts,
  canHide,
  onNew,
  onEdit,
  onDelete,
  onDeleteMany,
  onToggleHidden,
  onToggleHiddenMany,
}: {
  acts: Activity[];
  /** false finché la migrazione `activities_hidden` non è applicata. */
  canHide: boolean;
  onNew: () => void;
  onEdit: (a: Activity) => void;
  onDelete: (a: Activity) => void;
  /** Chiede conferma ed elimina: true se l'eliminazione è avvenuta. */
  onDeleteMany: (ids: number[]) => boolean;
  onToggleHidden: (a: Activity) => void;
  onToggleHiddenMany: (ids: number[], hidden: boolean) => void;
}) {
  const [filter, setFilter] = useState<Filter>("visible");

  const penalties = acts.filter(hasPen).sort((a, b) => a.pen - b.pen);
  // la card in cima parte aperta solo quando c'è davvero qualcosa da guardare
  const [openPen, setOpenPen] = useState(penalties.length > 0);

  const hiddenCount = acts.filter((a) => a.hidden).length;

  // frequenza come chiave principale, penalità più pesante come secondaria
  const shown = acts
    .filter((a) => matches(a, filter))
    .slice()
    .sort(byFreqThenPenalty);

  // "tutte" vuol dire quelle che si vedono: con un filtro attivo il resto non si tocca
  const s = useSelection(shown);

  // se ho selezionato solo roba già nascosta, il pulsante utile è "mostra"
  const pickedHidden = shown.filter((a) => s.isPicked(a.id) && a.hidden).length;
  const showRatherThanHide = s.count > 0 && pickedHidden === s.count;

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
                  <span style={{ color: P.tx, opacity: a.hidden ? 0.5 : 1 }}>
                    {a.hidden ? "🙈 " : ""}
                    {CATS.find((c) => c.id === a.cat)?.i} {a.name}
                  </span>
                  <span style={{ color: P.gold, fontWeight: 800 }}>{a.pen}pt</span>
                </div>
              ))}
            </div>
          ))}
      </GlassCard>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>{s.selecting ? `${s.count} selezionate` : `${shown.length} attività`}</span>
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
            <>
              <Btn small outline color={P.acc} onClick={s.start} disabled={shown.length === 0}>
                ☑️ Seleziona
              </Btn>
              <Btn small grad={P.accG} onClick={onNew}>
                + Nuova
              </Btn>
            </>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 3, overflowX: "auto", marginBottom: 10, paddingBottom: 3 }}>
        {FILTERS.map((f) => (
          <Pill key={f.k} active={filter === f.k} onClick={() => setFilter(f.k)} color={f.c} s>
            {f.l}
            {f.k === "hidden" && hiddenCount > 0 ? ` (${hiddenCount})` : ""}
          </Pill>
        ))}
      </div>

      {!canHide && (
        <p style={{ color: P.gold, fontSize: 10, margin: "-4px 0 10px", lineHeight: 1.4 }}>
          ⚠️ Per nascondere le attività serve la migrazione <code>activities_hidden</code>: finché non la esegui il toggle resta spento.
        </p>
      )}

      {shown.map((a) => {
        const checked = s.isPicked(a.id);
        const pen = hasPen(a);
        const off = !!a.hidden;
        return (
          <GlassCard
            key={a.id}
            onClick={s.selecting ? () => s.toggle(a.id) : undefined}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              padding: 12,
              cursor: s.selecting ? "pointer" : undefined,
              opacity: off ? 0.5 : 1,
              border: s.selecting && checked ? `1px solid ${alpha(P.acc, 40)}` : pen && !off ? `1px solid ${alpha(P.gold, 22)}` : undefined,
              background: s.selecting && checked ? alpha(P.acc, 7) : off ? alpha(P.tx3, 6) : pen ? alpha(P.gold, 4) : undefined,
            }}
          >
            {s.selecting && (
              <input
                type="checkbox"
                checked={checked}
                onChange={() => s.toggle(a.id)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: 17, height: 17, accentColor: P.acc, flexShrink: 0, cursor: "pointer" }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13 }}>{actIcon(a)}</span>
                <span style={{ color: pen && !off ? P.gold : P.tx, fontSize: 12, fontWeight: 600, textDecoration: off ? "line-through" : undefined }}>
                  {pen ? "⚠️ " : ""}
                  {a.name}
                </span>
                {pen && (
                  <span style={{ background: alpha(P.gold, 13), color: P.gold, padding: "1px 5px", borderRadius: 5, fontSize: 9, fontWeight: 800 }}>
                    {a.pen}pt
                  </span>
                )}
                {a.ch ? <span style={{ background: alpha(P.gold, 13), color: P.gold, padding: "1px 5px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>⚡</span> : null}
                {off && (
                  <span style={{ background: alpha(P.tx3, 20), color: P.tx2, padding: "1px 5px", borderRadius: 5, fontSize: 8, fontWeight: 700 }}>NASCOSTA</span>
                )}
              </div>
              <span style={{ fontSize: 10, color: P.tx3 }}>
                +{a.pts}pt · max ×{a.max}/{FREQ_UNIT[a.freq]}
                {a.duration ? ` · ⏱ ${a.duration}min` : ""}
              </span>
            </div>
            {!s.selecting && (
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button
                  onClick={() => onToggleHidden(a)}
                  disabled={!canHide}
                  title={off ? "Mostra alle ragazze" : "Nascondi alle ragazze"}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 16,
                    lineHeight: 1,
                    padding: "4px 2px",
                    cursor: canHide ? "pointer" : "default",
                    opacity: canHide ? 1 : 0.3,
                  }}
                >
                  {off ? "👁️‍🗨️" : "👁️"}
                </button>
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

      {shown.length === 0 && <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 16 }}>Nessuna attività con questo filtro</p>}

      {s.selecting && (
        <div style={{ position: "sticky", bottom: 8, marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <Btn
            full
            outline
            color={P.acc}
            disabled={s.count === 0 || !canHide}
            onClick={() => s.runOnSelection((ids) => onToggleHiddenMany(ids, !showRatherThanHide))}
          >
            {showRatherThanHide ? `👁️ Mostra selezionate (${s.count})` : `🙈 Nascondi selezionate (${s.count})`}
          </Btn>
          <Btn full color={P.red} disabled={s.count === 0} onClick={() => s.runOnSelection(onDeleteMany)}>
            🗑️ Elimina selezionate ({s.count})
          </Btn>
        </div>
      )}
    </div>
  );
}

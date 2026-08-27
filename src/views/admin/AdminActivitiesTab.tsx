import { useState } from "react";
import { FREQ_UNIT, actIcon, byFreqThenPenalty } from "../../data/constants";
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

/** Icona-azione della riga: resta cliccabile anche in modalità selezione. */
function RowAction({
  icon,
  title,
  disabled,
  onClick,
}: {
  icon: string;
  title: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      // la card intera seleziona: qui fermo la propagazione o un tap su ✏️ spunterebbe la riga
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        background: "none",
        border: "none",
        fontSize: 15,
        lineHeight: 1,
        padding: "5px 3px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {icon}
    </button>
  );
}

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

  const hiddenCount = acts.filter((a) => a.hidden).length;
  const penCount = acts.filter(hasPen).length;

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
      {s.selecting && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 5,
            background: P.bg,
            borderBottom: `1px solid ${P.gb}`,
            padding: "8px 0 10px",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ color: P.tx, fontWeight: 700, fontSize: 13 }}>{s.count} selezionate</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Btn small outline color={P.blue} onClick={s.toggleAll}>
                {s.allSelected ? "Deseleziona tutte" : "Seleziona tutte"}
              </Btn>
              <Btn small outline color={P.tx3} onClick={s.exit}>
                Annulla
              </Btn>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn
              style={{ flex: 1 }}
              small
              outline
              color={P.acc}
              disabled={s.count === 0 || !canHide}
              onClick={() => s.runOnSelection((ids) => onToggleHiddenMany(ids, !showRatherThanHide))}
            >
              {showRatherThanHide ? `👁️ Mostra (${s.count})` : `🙈 Nascondi (${s.count})`}
            </Btn>
            <Btn style={{ flex: 1 }} small color={P.red} disabled={s.count === 0} onClick={() => s.runOnSelection(onDeleteMany)}>
              🗑️ Elimina ({s.count})
            </Btn>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ color: P.tx, fontWeight: 700, fontSize: 14 }}>
          {shown.length} attività
          {penCount > 0 && filter !== "penalty" && <span style={{ color: P.gold, fontSize: 11, fontWeight: 600 }}> · ⚠️ {penCount} con penalità</span>}
        </span>
        {!s.selecting && (
          <div style={{ display: "flex", gap: 6 }}>
            <Btn small outline color={P.acc} onClick={s.start} disabled={shown.length === 0}>
              ☑️ Seleziona
            </Btn>
            <Btn small grad={P.accG} onClick={onNew}>
              + Nuova
            </Btn>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 3, overflowX: "auto", marginBottom: 10, paddingBottom: 3 }}>
        {FILTERS.map((f) => (
          <Pill key={f.k} active={filter === f.k} onClick={() => setFilter(f.k)} color={f.c} s>
            {f.l}
            {f.k === "hidden" && hiddenCount > 0 ? ` (${hiddenCount})` : ""}
            {f.k === "penalty" && penCount > 0 ? ` (${penCount})` : ""}
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
              // il bordo ambra segnala la penalità; la selezione ha la precedenza
              border: s.selecting && checked ? `1px solid ${alpha(P.acc, 40)}` : pen && !off ? `1px solid ${alpha(P.gold, 30)}` : undefined,
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13 }}>{actIcon(a)}</span>
                <span style={{ color: P.tx, fontSize: 12, fontWeight: 600, textDecoration: off ? "line-through" : undefined }}>{a.name}</span>
                {pen && (
                  <span style={{ background: alpha(P.red, 14), color: P.red, padding: "1px 5px", borderRadius: 5, fontSize: 9, fontWeight: 800 }}>
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
            {/* sempre visibili, anche durante la selezione multipla */}
            <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
              <RowAction icon="✏️" title="Modifica" onClick={() => onEdit(a)} />
              <RowAction
                icon={off ? "👁️‍🗨️" : "👁️"}
                title={off ? "Mostra alle ragazze" : "Nascondi alle ragazze"}
                disabled={!canHide}
                onClick={() => onToggleHidden(a)}
              />
              <RowAction icon="🗑️" title="Elimina" onClick={() => onDelete(a)} />
            </div>
          </GlassCard>
        );
      })}

      {shown.length === 0 && <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 16 }}>Nessuna attività con questo filtro</p>}
    </div>
  );
}

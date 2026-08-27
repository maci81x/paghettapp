import { useState } from "react";

/**
 * Modalità "seleziona più voci" condivisa dai tab dell'admin.
 * `items` sono le voci attualmente a schermo: "seleziona tutte" vale su
 * quelle, così con un filtro attivo il resto non viene toccato.
 */
export function useSelection(items: { id: number }[]) {
  const [selecting, setSelecting] = useState(false);
  const [sel, setSel] = useState<number[]>([]);

  const allSelected = items.length > 0 && items.every((i) => sel.includes(i.id));

  const exit = () => {
    setSelecting(false);
    setSel([]);
  };

  const toggle = (id: number) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const toggleAll = () => setSel(allSelected ? [] : items.map((i) => i.id));

  /**
   * Esegue l'azione sulle voci scelte e chiude la modalità selezione.
   * Un'azione che ritorna `false` (conferma annullata) lascia tutto com'è.
   */
  const runOnSelection = (action: (ids: number[]) => boolean | void) => {
    if (sel.length === 0) return;
    if (action(sel) !== false) exit();
  };

  return {
    selecting,
    sel,
    count: sel.length,
    allSelected,
    isPicked: (id: number) => sel.includes(id),
    start: () => setSelecting(true),
    exit,
    toggle,
    toggleAll,
    runOnSelection,
  };
}

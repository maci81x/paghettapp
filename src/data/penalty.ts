// estensione esplicita: così `node --test` esegue i test senza bundler
import type { Activity } from "./types";

/**
 * Un'attività si può penalizzare solo se ha una penalità configurata **e** la
 * figlia non l'ha ancora segnata oggi: una cosa già fatta non è "non svolta",
 * addebitarla sarebbe un doppio danno (niente punti e pure la penalità).
 */
export const isPenalizable = (a: Activity, doneToday: number) => a.pen < 0 && doneToday === 0;

/** Attività con penalità, indipendentemente da cosa è stato fatto oggi. */
export const withPenalty = (acts: Activity[]) => acts.filter((a) => a.pen < 0);

/** Solo quelle su cui l'admin può davvero addebitare la penalità adesso. */
export const penalizableToday = (acts: Activity[], doneToday: (actId: number) => number) =>
  withPenalty(acts).filter((a) => isPenalizable(a, doneToday(a.id)));

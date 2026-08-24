import { useEffect, useMemo, useState } from "react";
import { fetchSavingsHistory } from "../data/api";
import { movesFromUser, savingsSeries, savingsSummary } from "../data/savings";
import type { SavingsPoint, SavingsSummary } from "../data/savings";
import type { SavingsMove, User, UserId } from "../data/types";

export interface SavingsHistory {
  moves: SavingsMove[];
  series: SavingsPoint[];
  summary: SavingsSummary;
}

/**
 * Andamento del salvadanaio Risparmio.
 * Prova a leggere i movimenti dal database; finché non arrivano (o se non
 * risponde) usa quelli ricostruiti dai dati già in memoria, così il grafico
 * c'è anche offline e non resta mai una scheda vuota.
 */
export function useSavingsHistory(uid: UserId, u: User, days = 90): SavingsHistory {
  // la chiave tiene insieme dati e figlia: cambiando scheda non si vede lo storico dell'altra
  const [remote, setRemote] = useState<{ uid: UserId; moves: SavingsMove[] } | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetchSavingsHistory(uid);
      if (alive && res.data) setRemote({ uid, moves: res.data });
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  const local = useMemo(() => movesFromUser(u), [u]);
  const moves = remote?.uid === uid ? remote.moves : local;
  const current = u.w.risparmio;

  return useMemo(() => {
    const series = savingsSeries(moves, current, days);
    return { moves, series, summary: savingsSummary(moves, current, series) };
  }, [moves, current, days]);
}

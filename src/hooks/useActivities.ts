import { INIT_ACTS } from "../data/constants";
import { useLocalStorage } from "../data/storage";
import type { Activity, ActivityDraft } from "../data/types";

export function useActivities() {
  const [acts, setActs] = useLocalStorage<Activity[]>("acts", () => INIT_ACTS);

  /** Campo facoltativo: vuoto o non valido = nessuna durata indicata. */
  const parseDuration = (v: string) => {
    const n = parseInt(v, 10);
    return n > 0 ? n : undefined;
  };

  const addAct = (d: ActivityDraft) =>
    setActs((p) => [
      ...p,
      {
        id: Date.now(),
        name: d.name.trim(),
        cat: d.cat || "casa",
        pts: d.pts || 3,
        pen: d.pen || 0,
        freq: d.freq || "daily",
        max: Math.max(1, d.max || 1),
        ch: d.ch || 0,
        chPts: d.ch ? (d.pts || 3) * 2 : 0,
        duration: parseDuration(d.duration),
      },
    ]);

  const updateAct = (d: ActivityDraft) =>
    setActs((p) =>
      p.map((a) =>
        a.id === d.id
          ? {
              ...a,
              name: d.name.trim(),
              cat: d.cat,
              pts: d.pts,
              pen: d.pen,
              freq: d.freq,
              max: Math.max(1, d.max),
              ch: d.ch,
              chPts: d.ch ? d.pts * 2 : 0,
              duration: parseDuration(d.duration),
            }
          : a,
      ),
    );

  const delAct = (id: number) => setActs((p) => p.filter((a) => a.id !== id));

  const findAct = (id: number) => acts.find((a) => a.id === id);

  return { acts, addAct, updateAct, delAct, findAct };
}

export type ActivitiesApi = ReturnType<typeof useActivities>;

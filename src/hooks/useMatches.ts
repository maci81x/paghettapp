import { todayISO } from "../data/constants";
import { initMatches } from "../data/defaults";
import { useLocalStorage } from "../data/storage";
import type { Match, MatchDraft } from "../data/types";

export function useMatches() {
  const [matches, setMatches] = useLocalStorage<Match[]>("matches", initMatches);

  const addMatch = (d: MatchDraft) =>
    setMatches((p) => [
      ...p,
      {
        id: Date.now(),
        name: d.name.trim(),
        desc: d.desc || "",
        prize: d.prize || "",
        act: d.act,
        durDays: Math.max(1, d.durDays || 7),
        started: todayISO(),
        vis: false,
      },
    ]);

  const updateMatch = (d: MatchDraft) =>
    setMatches((p) =>
      p.map((m) => (m.id === d.id ? { ...m, name: d.name.trim(), desc: d.desc, prize: d.prize, act: d.act, durDays: Math.max(1, d.durDays) } : m)),
    );

  const delMatch = (id: number) => setMatches((p) => p.filter((m) => m.id !== id));

  const toggleVis = (id: number) => setMatches((p) => p.map((m) => (m.id === id ? { ...m, vis: !m.vis } : m)));

  return { matches, addMatch, updateMatch, delMatch, toggleVis };
}

export type MatchesApi = ReturnType<typeof useMatches>;

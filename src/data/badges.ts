import type { User } from "./types";
import { getWeekPts } from "./weekBounds.ts";

/**
 * Badge meritati in base allo stato attuale.
 * `first_invest` non è qui: si sblocca agendo sul simulatore, non da uno stato.
 */
export const earnedBadges = (u: User, actIds: number[]): string[] => {
  const out: string[] = [];
  const weekPts = getWeekPts(u.log);
  if (weekPts >= 500 || (u.pays ?? []).some((p) => p.pts >= 500)) out.push("first_15");
  if (u.streak >= 10) out.push("streak_10");
  if (u.streak >= 30) out.push("streak_30");
  if (u.w.risparmio >= 100) out.push("saver_100");
  if ((u.wishes ?? []).some((w) => w.done)) out.push("wish_bought");

  const byDay = new Map<string, { pts: number; acts: Set<number> }>();
  u.log.forEach((l) => {
    if (!l.ok) return;
    const d = byDay.get(l.date) ?? { pts: 0, acts: new Set<number>() };
    d.pts += l.pts;
    d.acts.add(l.actId);
    byDay.set(l.date, d);
  });
  for (const d of byDay.values()) {
    if (d.pts >= 100) out.push("pts_100_day");
    if (actIds.length > 0 && actIds.every((id) => d.acts.has(id))) out.push("all_activities");
  }
  return out;
};

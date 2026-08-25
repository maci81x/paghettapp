import { useEffect, useState } from "react";
import { fetchInterestHistory } from "../data/api";
import { monthlyInterest, periodOf } from "../data/interest";
import type { InterestLog, UserId } from "../data/types";

export interface InterestView {
  /** Accrediti dal più recente. */
  history: InterestLog[];
  /** Accredito del mese in corso, se già chiuso e pagato. */
  thisMonth?: InterestLog;
  /** Stima di quanto renderà il saldo attuale a fine mese. */
  projected: number;
  total: number;
}

/** Storico degli interessi accreditati, letto dal database. */
export function useInterest(uid: UserId, balance: number): InterestView {
  const [history, setHistory] = useState<InterestLog[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const res = await fetchInterestHistory(uid);
      if (alive && res.data) setHistory([...res.data].reverse());
    })();
    return () => {
      alive = false;
    };
  }, [uid]);

  return {
    history,
    thisMonth: history.find((h) => h.period === periodOf(new Date())),
    projected: monthlyInterest(balance),
    total: +history.reduce((s, h) => s + h.amount, 0).toFixed(2),
  };
}

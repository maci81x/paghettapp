import { useEffect, useState } from "react";

const PREFIX = "paghettapp:";

/** useState persistito su localStorage. Scrittura non bloccante, letture tolleranti. */
export function useLocalStorage<T>(key: string, initial: () => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : initial();
    } catch {
      return initial();
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // quota piena o storage non disponibile: l'app continua in memoria
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/* ══════════════════════════════════════════════════════════════
   Fallback offline: copia locale dei dati + coda delle scritture
   ══════════════════════════════════════════════════════════════ */

const read = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota piena: l'app continua senza cache
  }
};

/** Ultima fotografia dei dati letti da Supabase: serve ad aprire l'app offline. */
export const saveCache = <T>(snapshot: T) => write("cache", snapshot);
export const loadCache = <T>(): T | null => read<T>("cache");

/** Scrittura non riuscita, in attesa di essere rispedita. */
export interface PendingOp {
  name: string;
  args: unknown[];
}

export const loadPending = (): PendingOp[] => read<PendingOp[]>("pendingSync") ?? [];
export const savePending = (ops: PendingOp[]) => write("pendingSync", ops);
export const queuePending = (op: PendingOp) => savePending([...loadPending(), op]);
export const clearPending = () => savePending([]);

/** Azzera tutti i dati salvati dall'app. */
export const clearStorage = () => {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
};

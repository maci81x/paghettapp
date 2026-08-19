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

/** Azzera tutti i dati salvati dall'app. */
export const clearStorage = () => {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
};

import { useState } from "react";
import { DEFAULT_PINS } from "../data/constants";
import { useLocalStorage } from "../data/storage";
import type { PinKey, Screen, UserId } from "../data/types";

/** Login con selezione profilo + PIN a 4 cifre. I PIN sono persistiti. */
export function useAuth() {
  const [pins, setPins] = useLocalStorage<Record<PinKey, string>>("pins", () => ({ ...DEFAULT_PINS }));
  const [scr, setScr] = useState<Screen>("login");
  const [au, setAu] = useState<UserId | null>(null);
  const [target, setTarget] = useState<PinKey | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);

  const startLogin = (k: PinKey) => {
    setTarget(k);
    setPin("");
    setErr(false);
    setScr("pin");
  };

  const press = (d: string) => {
    if (!target || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length < 4) return;
    if (next === pins[target]) {
      if (target === "admin") {
        setAu(null);
        setScr("admin");
      } else {
        setAu(target);
        setScr("app");
      }
      setPin("");
    } else {
      setErr(true);
      setTimeout(() => {
        setPin("");
        setErr(false);
      }, 500);
    }
  };

  const del = () => setPin((p) => p.slice(0, -1));

  const toLogin = () => {
    setScr("login");
    setTarget(null);
    setPin("");
    setErr(false);
  };

  const logout = () => {
    setAu(null);
    toLogin();
  };

  const changePin = (k: PinKey, value: string) => setPins((p) => ({ ...p, [k]: value }));
  const resetPin = (k: PinKey) => setPins((p) => ({ ...p, [k]: DEFAULT_PINS[k] }));

  return { scr, au, target, pin, err, pins, startLogin, press, del, toLogin, logout, changePin, resetPin };
}

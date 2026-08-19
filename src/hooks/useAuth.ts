import { useState } from "react";
import type { PinKey, Screen, UserId } from "../data/types";

/**
 * Login con selezione profilo + PIN a 4 cifre.
 * La verifica è delegata: con la migrazione dei PIN avviene sul database e il
 * PIN corretto non arriva mai al browser.
 */
export function useAuth(verify: (k: PinKey, pin: string) => Promise<boolean>) {
  const [scr, setScr] = useState<Screen>("login");
  const [au, setAu] = useState<UserId | null>(null);
  const [target, setTarget] = useState<PinKey | null>(null);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState(false);
  const [checking, setChecking] = useState(false);
  /** PIN inserito al login: serve all'admin per cambiare i PIN senza ridigitarlo. */
  const [sessionPin, setSessionPin] = useState("");

  const startLogin = (k: PinKey) => {
    setTarget(k);
    setPin("");
    setErr(false);
    setScr("pin");
  };

  const press = async (d: string) => {
    if (!target || pin.length >= 4 || checking) return;
    const next = pin + d;
    setPin(next);
    if (next.length < 4) return;

    setChecking(true);
    const ok = await verify(target, next);
    setChecking(false);
    if (ok) {
      setSessionPin(next);
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
    setSessionPin("");
    toLogin();
  };

  return { scr, au, target, pin, err, checking, sessionPin, startLogin, press, del, toLogin, logout, setSessionPin };
}

import { supabase } from "./supabase";

/**
 * Notifiche push. Su iPhone funzionano solo con l'app aggiunta alla schermata
 * Home (iOS 16.4+); il permesso si chiede solo dopo un tocco dell'utente.
 * Tutto passa dalla funzione Supabase `push`: le chiavi non stanno nell'app.
 */
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export const pushState = (): "unsupported" | "granted" | "denied" | "default" => (pushSupported() ? Notification.permission : "unsupported");

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

/** Chiede il permesso e registra questo telefono per `userId`. Restituisce l'errore in chiaro, o null. */
export const enablePush = async (userId: string): Promise<string | null> => {
  if (!pushSupported()) return "Su questo telefono le notifiche non si possono attivare. Su iPhone aggiungi prima l'app alla schermata Home.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Permesso negato: puoi riattivarlo dalle impostazioni del telefono.";
  const reg = await navigator.serviceWorker.ready;
  const key = await supabase.functions.invoke<{ publicKey: string }>("push", { body: { action: "key" } });
  if (key.error || !key.data?.publicKey) return "Il server delle notifiche non risponde. Riprova più tardi.";
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key.data.publicKey) }));
  const res = await supabase.functions.invoke("push", { body: { action: "subscribe", user_id: userId, subscription: sub.toJSON() } });
  return res.error ? "Iscrizione non riuscita. Riprova più tardi." : null;
};

/** Dopo "Ricordalo a Babbo Roby": avvisa subito il suo telefono. Se non va, resta l'avviso nell'app. */
export const pushNudge = (userId: string) => supabase.functions.invoke("push", { body: { action: "nudge", user_id: userId } }).catch(() => undefined);

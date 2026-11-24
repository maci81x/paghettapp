// Notifiche push di PaghettApp (Supabase Edge Function "push").
//
// Azioni (POST, corpo JSON { action, ... }):
//   key        → chiave pubblica VAPID (la crea al primo avvio, la privata resta nel database)
//   subscribe  → registra questo telefono per { user_id, subscription }
//   nudge      → "Mia ti ricorda la paghetta": avvisa papà (una volta ogni 7 giorni per ragazza)
//   weekly     → promemoria del lunedì alle 19 (ora italiana) a papà e alle ragazze
//
// Le tabelle push_config e push_subscriptions non sono leggibili dall'app:
// ci arriva solo questa funzione, con la service role che Supabase le passa.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const euro = (n: number) => `€${n.toFixed(2).replace(".", ",")}`;
const NAMES: Record<string, string> = { mia: "Mia", samira: "Sami" };
const APP = "https://maci81x.github.io/paghettapp/";

async function keys() {
  const { data } = await db.from("push_config").select("*").eq("id", 1).maybeSingle();
  if (data) return data as { public_key: string; private_key: string; last_weekly_at: string | null };
  const k = webpush.generateVAPIDKeys();
  // on conflict: se due richieste arrivano insieme vince la prima, e si rilegge quella
  await db.from("push_config").upsert({ id: 1, public_key: k.publicKey, private_key: k.privateKey }, { onConflict: "id", ignoreDuplicates: true });
  const again = await db.from("push_config").select("*").eq("id", 1).single();
  return again.data as { public_key: string; private_key: string; last_weekly_at: string | null };
}

async function sendTo(userIds: string[], title: string, body: string) {
  const k = await keys();
  webpush.setVapidDetails("mailto:maci81x@users.noreply.github.com", k.public_key, k.private_key);
  const { data: subs } = await db.from("push_subscriptions").select("*").in("user_id", userIds);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title, body, url: APP }));
      sent++;
    } catch (e) {
      // 404/410: il telefono ha tolto il permesso o reinstallato l'app → iscrizione da buttare
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return sent;
}

async function arrears() {
  const { data } = await db.from("v_arrears").select("user_id,amount");
  const by: Record<string, { amount: number; weeks: number }> = {};
  for (const r of data ?? []) {
    by[r.user_id] ??= { amount: 0, weeks: 0 };
    by[r.user_id].amount += Number(r.amount);
    by[r.user_id].weeks += 1;
  }
  return by;
}

const romeHour = () => Number(new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", hour12: false }).format(new Date()));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let p: Record<string, unknown> = {};
  try {
    p = await req.json();
  } catch {
    return json({ error: "corpo JSON mancante" }, 400);
  }

  switch (p.action) {
    case "key":
      return json({ publicKey: (await keys()).public_key });

    case "subscribe": {
      const uid = String(p.user_id ?? "");
      const sub = p.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;
      if (!["mia", "samira", "admin"].includes(uid) || !sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) return json({ error: "iscrizione non valida" }, 400);
      const { error } = await db.from("push_subscriptions").upsert({ endpoint: sub.endpoint, user_id: uid, p256dh: sub.keys.p256dh, auth: sub.keys.auth });
      return error ? json({ error: error.message }, 500) : json({ ok: true });
    }

    case "nudge": {
      const uid = String(p.user_id ?? "");
      if (!(uid in NAMES)) return json({ error: "utente non valido" }, 400);
      // stesso limite dell'app: il promemoria vale solo se registrato da meno di un minuto
      const { data: u } = await db.from("users").select("allowance_nudged_at").eq("id", uid).single();
      const at = u?.allowance_nudged_at ? new Date(u.allowance_nudged_at).getTime() : 0;
      if (Date.now() - at > 60_000) return json({ ok: false, reason: "nessun promemoria recente" });
      const a = (await arrears())[uid];
      const body = a ? `Aspetta ${euro(a.amount)} da ${a.weeks} ${a.weeks === 1 ? "settimana" : "settimane"}.` : "Ti ricorda la paghetta.";
      return json({ sent: await sendTo(["admin"], `${NAMES[uid]} ti ricorda la paghetta`, body) });
    }

    case "weekly": {
      if (romeHour() !== 19 && p.force !== true) return json({ ok: false, reason: "non sono le 19 in Italia" });
      const k = await keys();
      // al massimo una volta ogni 6 giorni, anche se qualcuno chiama la funzione a mano
      if (k.last_weekly_at && Date.now() - new Date(k.last_weekly_at).getTime() < 6 * 864e5) return json({ ok: false, reason: "già inviato" });
      await db.from("push_config").update({ last_weekly_at: new Date().toISOString() }).eq("id", 1);
      const by = await arrears();
      const owed = Object.entries(by);
      let sent = 0;
      if (owed.length) {
        const total = owed.reduce((s, [, a]) => s + a.amount, 0);
        const detail = owed.map(([uid, a]) => `${NAMES[uid] ?? uid} ${euro(a.amount)}`).join(", ");
        sent += await sendTo(["admin"], `Paghette da pagare · ${euro(total)}`, `${detail}. Tocca per pagarle.`);
        for (const [uid, a] of owed) {
          sent += await sendTo([uid], `Babbo Roby ti deve ${euro(a.amount)}`, `${a.weeks} ${a.weeks === 1 ? "settimana" : "settimane"} di paghetta. Puoi ricordarglielo dall'app.`);
        }
      }
      return json({ ok: true, sent });
    }
  }
  return json({ error: "azione sconosciuta" }, 400);
});

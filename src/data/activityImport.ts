import { CATS } from "./constants.ts";
import type { Freq } from "./types";

/** Un'attività letta dal foglio, pronta da creare. */
export interface ImportedActivity {
  name: string;
  desc: string;
  pts: number;
  pen: number;
  cat: string;
  freq: Freq;
  ch: 0 | 1;
  /** Esiste già un'attività con lo stesso nome: non si importa due volte. */
  duplicate: boolean;
}

export interface ImportResult {
  items: ImportedActivity[];
  /** Righe scartate, con il motivo in chiaro ("Riga 4: punteggio mancante"). */
  errors: string[];
}

/** minuscolo, senza accenti né spazi ai bordi: "Penalità " → "penalita". */
const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Intestazioni accettate per ogni campo: il foglio può chiamarle in modi diversi. */
const HEADERS: Record<string, string[]> = {
  name: ["nome", "attivita", "name"],
  desc: ["descrizione", "description", "note"],
  pts: ["punteggio", "punti", "points", "pts"],
  pen: ["penalita", "penalty", "pen", "malus"],
  cat: ["categoria", "category", "cat"],
  daily: ["daily", "giornaliera", "quotidiana", "ogni giorno", "frequenza"],
  ch: ["sfida", "challenge"],
};

const YES = new Set(["si", "sì", "s", "x", "1", "true", "vero", "yes", "y", "✓", "✔", "daily", "giornaliera", "quotidiana"]);

const toNumber = (raw: string): number | null => {
  const t = raw.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** Categoria dal suo id, dal nome o dall'icona. */
const findCat = (raw: string): string | undefined => {
  const v = norm(raw);
  if (!v) return undefined;
  return CATS.find((c) => c.id === v || norm(c.n) === v || c.i === raw.trim())?.id;
};

/** Frequenza da una cella "daily" (sì/no) o "frequenza" (giornaliera/settimanale/mensile). */
const toFreq = (raw: string): Freq => {
  const v = norm(raw);
  if (v.startsWith("sett") || v === "weekly") return "weekly";
  if (v.startsWith("mens") || v === "monthly") return "monthly";
  return YES.has(v) ? "daily" : "weekly";
};

/**
 * Dalle righe del foglio alle attività da creare. La prima riga deve essere
 * l'intestazione. Le righe incomplete si scartano una per una, senza fermare
 * l'import delle altre.
 */
export const parseActivityRows = (rows: string[][], existingNames: string[]): ImportResult => {
  const errors: string[] = [];
  if (rows.length === 0) return { items: [], errors: ["Il file è vuoto."] };

  const header = rows[0].map(norm);
  const col = Object.fromEntries(Object.entries(HEADERS).map(([k, alts]) => [k, header.findIndex((h) => alts.includes(h))])) as Record<
    keyof typeof HEADERS,
    number
  >;
  if (col.name < 0 || col.pts < 0) {
    return { items: [], errors: ["Servono almeno le colonne \"nome\" e \"punteggio\" nella prima riga."] };
  }

  const known = new Set(existingNames.map(norm));
  const items: ImportedActivity[] = [];
  const cell = (r: string[], k: keyof typeof HEADERS) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");

  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const name = cell(r, "name");
    if (!name) {
      errors.push(`Riga ${line}: nome mancante.`);
      return;
    }
    const pts = toNumber(cell(r, "pts"));
    if (pts === null || pts <= 0) {
      errors.push(`Riga ${line} (${name}): punteggio mancante o non valido.`);
      return;
    }
    const penRaw = toNumber(cell(r, "pen"));
    if (cell(r, "pen") !== "" && penRaw === null) {
      errors.push(`Riga ${line} (${name}): penalità non valida.`);
      return;
    }
    const catRaw = cell(r, "cat");
    const cat = catRaw ? findCat(catRaw) : "casa";
    if (!cat) {
      errors.push(`Riga ${line} (${name}): categoria "${catRaw}" sconosciuta.`);
      return;
    }
    const key = norm(name);
    items.push({
      name,
      desc: cell(r, "desc"),
      pts: Math.round(pts),
      // la penalità è sempre una perdita: "5" e "-5" vogliono dire la stessa cosa
      pen: -Math.abs(Math.round(penRaw ?? 0)),
      cat,
      freq: toFreq(cell(r, "daily")),
      ch: YES.has(norm(cell(r, "ch"))) ? 1 : 0,
      duplicate: known.has(key),
    });
    known.add(key);
  });

  return { items, errors };
};

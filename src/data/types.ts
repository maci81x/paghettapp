export type UserId = "mia" | "samira";
export type PinKey = UserId | "admin";
export type Freq = "daily" | "weekly" | "monthly";
export type Tod = "mattina" | "pomeriggio" | "sera";
export type Fund = "risparmio" | "personale" | "beneficenza";
export type Period = "7g" | "30g" | "3m" | "1a";
export type Screen = "login" | "pin" | "app" | "admin";
export type ChildTab = "home" | "act" | "miss" | "wallet" | "invest" | "profile";
export type AdminTab = "approve" | "acts" | "miss" | "match" | "piggy" | "pins";

export interface Category {
  id: string;
  n: string;
  i: string;
  c: string;
}

export interface Activity {
  id: number;
  name: string;
  /** Emoji propria dell'attività; senza, vale quella della categoria. */
  emoji?: string;
  cat: string;
  pts: number;
  pen: number;
  freq: Freq;
  max: number;
  ch: 0 | 1;
  chPts?: number;
  /** Durata indicativa in minuti: mostrata alle ragazze, non vincolante. */
  duration?: number;
  /**
   * Nascosta: resta nell'elenco dell'admin ma non viene più proposta alle
   * ragazze. Diverso dall'eliminazione, che toglie la riga da ogni lista.
   */
  hidden?: boolean;
}

/**
 * Un completamento = una voce. La stessa attività segnata in due momenti della
 * giornata produce due voci distinte (una per `tod`), mai una sola sommata.
 */
export interface LogEntry {
  id: number;
  actId: number;
  date: string;
  cnt: number;
  note: string;
  tod: Tod;
  pts: number;
  ok: boolean;
  /** true quando i punti sono già confluiti in una paghetta accreditata. */
  paid?: boolean;
  /** true quando l'admin ha annullato un'approvazione: resta a storico. */
  revoked?: boolean;
}

export interface Mission {
  id: number;
  name: string;
  /** Emoji della missione: il database ne garantisce sempre una. */
  emoji: string;
  /** Descrizione dettagliata: cosa fare, come, perché. */
  desc: string;
  /** Contatore manuale: usato solo se la missione non è collegata ad attività. */
  prog: number;
  tgt: number;
  pts: number;
  team: boolean;
  /** Scadenza ISO YYYY-MM-DD ("" se senza scadenza). */
  deadline: string;
  assignee: UserId | "both";
  /** Attività che fanno avanzare la missione: vuoto = avanzamento manuale. */
  actIds: number[];
  /** Giorno di creazione (ISO): contano solo i completamenti da qui in poi. */
  since: string;
  /**
   * Contatore manuale di ciascuna assegnataria, usato quando la missione non
   * è collegata ad attività. `prog` è la fetta di chi sta guardando.
   */
  progBy?: Partial<Record<UserId, number>>;
  /**
   * Chi ha già ricevuto i punti, con il giorno: è la guardia contro il doppio
   * premio. Assente finché la migrazione `missions_completed_by` non è
   * applicata.
   */
  completedBy?: Partial<Record<UserId, string>>;
  /**
   * Nascosta: resta nell'elenco dell'admin, con il suo progresso, ma non
   * viene più mostrata alle ragazze. Diverso dall'eliminazione.
   */
  hidden?: boolean;
}

export interface Spesa {
  id: number;
  /** Giorno in formato "gg/mm": è solo l'etichetta mostrata. */
  d: string;
  /**
   * Giorno reale (ISO): serve per filtrare per periodo, cosa che `d` non
   * permette perché non porta l'anno. Facoltativo nelle cache salvate prima.
   */
  date?: string;
  ds: string;
  a: number;
  f: Fund;
}

export interface InvestCfg {
  amt: number;
  mo: number;
  ex: number;
}

/** Paghetta settimanale accreditata dall'admin. */
export interface Payment {
  id: number;
  week: string; // lunedì della settimana pagata (ISO)
  date: string; // giorno dell'accredito (ISO)
  pts: number;
  amount: number;
  split: Record<Fund, number>;
  /** Voci di log saldate da questo accredito: servono per annullarlo. */
  logIds: number[];
  /** true quando la ragazza ha confermato di aver ricevuto i soldi. */
  confirmed?: boolean;
  /** Istante della conferma (timestamp ISO completo). */
  confirmedAt?: string;
}

/** Entrata registrata: paghetta settimanale o extra (regalo, lavoretto). */
export interface IncomeEntry {
  id: number;
  date: string; // ISO
  amount: number;
  source: string;
  /** Percentuali usate per dividere l'importo (somma 100). */
  split: Record<Fund, number>;
  type: "extra" | "paghetta" | "regalo";
  /** true quando la ragazza ha confermato di aver ricevuto i soldi. */
  confirmed?: boolean;
  /** Istante della conferma (timestamp ISO completo). */
  confirmedAt?: string;
}

/** Interesse accreditato su un salvadanaio in un mese chiuso. */
export interface InterestLog {
  id: number;
  /** Mese accreditato, formato YYYY-MM. */
  period: string;
  balanceBefore: number;
  amount: number;
  rate: number;
  date: string;
}

/** Movimento del salvadanaio Risparmio: quota versata (+) o prelievo (−). */
export interface SavingsMove {
  /** Giorno del movimento (ISO). */
  date: string;
  delta: number;
  label: string;
}

export interface Wish {
  id: number;
  name: string;
  cost: number;
  fund: Fund;
  /** 1 = alta, 2 = media, 3 = bassa. */
  priority: 1 | 2 | 3;
  done: boolean;
}

export interface Badge {
  id: string;
  n: string;
  i: string;
  hint: string;
}

export interface User {
  n: string;
  c: string;
  av: string;
  grad: string;
  totalPts: number;
  streak: number;
  w: Record<Fund, number>;
  /** "Dove lo tieni": nota libera scritta dalla ragazza. */
  wN: Record<Fund, string>;
  /**
   * Nome che la ragazza ha dato a ogni salvadanaio. Facoltativo: manca nelle
   * cache salvate prima della feature e finché la colonna `nickname` non è
   * stata aggiunta al database.
   */
  wNick?: Record<Fund, string>;
  inv: InvestCfg;
  spese: Spesa[];
  log: LogEntry[];
  miss: Mission[];
  /** Facoltativi: i dati salvati prima di queste feature non hanno il campo. */
  pays?: Payment[];
  income?: IncomeEntry[];
  wishes?: Wish[];
  badges?: string[];
  /** Badge id → giorno di sblocco (ISO). */
  badgeAt?: Record<string, string>;
  /* ── personalizzazione (tutti facoltativi: senza valore valgono i default) ── */
  /** Foto profilo come data URL JPEG ridimensionato. */
  profilePhoto?: string;
  themeColors?: { from: string; to: string };
  /** Valore CSS per background-image. */
  bgPattern?: string;
  /** Nome scelto dalla figlia, max 15 caratteri. */
  nickname?: string;
}

export type Users = Record<UserId, User>;

export interface Match {
  id: number;
  name: string;
  desc: string;
  prize: string;
  act: string;
  durDays: number;
  started: string;
  vis: boolean;
}

export interface Level {
  n: string;
  min: number;
  max: number;
  i: string;
  c: string;
}

export interface Tier {
  min: number;
  max: number;
  r: number;
}

/* ── Draft usati dai modali ── */

export interface CompletionDraft {
  actId: number;
  actName: string;
  cnt: number;
  maxCnt: number;
  freq: string;
  note: string;
  tod: Tod;
  /** Durata prevista in minuti, se l'admin l'ha indicata. */
  duration?: number;
}

export interface ActivityDraft {
  mode: "add" | "edit";
  id?: number;
  name: string;
  emoji: string;
  cat: string;
  pts: number;
  pen: number;
  freq: Freq;
  max: number;
  ch: 0 | 1;
  /** Stringa perché il campo può restare vuoto. */
  duration: string;
}

export interface MatchDraft {
  mode: "add" | "edit";
  id?: number;
  name: string;
  desc: string;
  prize: string;
  act: string;
  durDays: number;
}

export interface MissionDraft {
  mode: "add" | "edit";
  id?: number;
  name: string;
  emoji: string;
  desc: string;
  tgt: number;
  pts: number;
  team: boolean;
  deadline: string;
  to: UserId | "both";
  actIds: number[];
  /** Conservato nella modifica: riscriverlo azzererebbe il progresso. */
  since?: string;
}

export interface IncomeDraft {
  amount: string;
  source: string;
  date: string;
  split: Record<Fund, string>;
}

export interface WishDraft {
  mode: "add" | "edit";
  id?: number;
  name: string;
  cost: string;
  fund: Fund;
  priority: 1 | 2 | 3;
}

export interface GiftDraft {
  /** Chi ha fatto il regalo. */
  from: string;
  /** Per cosa: compleanno, promozione, un pensiero. */
  reason: string;
  amount: string;
}

export interface SpesaDraft {
  ds: string;
  a: string;
  f: Fund;
}

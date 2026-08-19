import { P } from "../design/tokens";
import { todayISO } from "./constants";
import type { Match, User, Users } from "./types";

const mkU = (n: string, c: string, av: string, grad: string): User => {
  const today = todayISO();
  return {
    n,
    c,
    av,
    grad,
    totalPts: 1240,
    streak: 5,
    w: { risparmio: 42.6, personale: 85.2, beneficenza: 14.2 },
    wN: {
      risparmio: "Salvadanaio rosa sulla scrivania",
      personale: "Borsellino nello zaino",
      beneficenza: "Barattolo in cucina",
    },
    inv: { amt: 30, mo: 12, ex: 5 },
    spese: [
      { id: 1, d: "12/08", ds: "Gelato", a: 3.5, f: "personale" },
      { id: 2, d: "10/08", ds: "Quaderno", a: 2, f: "personale" },
      { id: 3, d: "08/08", ds: "Regalo amico", a: 5, f: "beneficenza" },
    ],
    log: [
      { id: 1, actId: 1, date: today, cnt: 1, note: "", tod: "mattina", pts: 3, ok: true },
      { id: 2, actId: 6, date: today, cnt: 1, note: "Passeggiata lunga al parco", tod: "mattina", pts: 5, ok: true },
      { id: 3, actId: 11, date: today, cnt: 1, note: "Percy Jackson cap.4", tod: "pomeriggio", pts: 8, ok: true },
      { id: 4, actId: 15, date: today, cnt: 2, note: "Aiutata con compiti e gioco", tod: "pomeriggio", pts: 16, ok: false },
      { id: 5, actId: 2, date: today, cnt: 1, note: "", tod: "mattina", pts: 3, ok: true },
      { id: 6, actId: 19, date: today, cnt: 1, note: "Mela", tod: "mattina", pts: 3, ok: true },
      { id: 7, actId: 8, date: today, cnt: 1, note: "Dopo pranzo", tod: "pomeriggio", pts: 3, ok: true },
    ],
    miss: [
      {
        id: 1,
        name: "Settimana green",
        desc: "Ogni giorno porta fuori Tia e mangia almeno un frutto: 5 giorni su 7 per completare la missione.",
        prog: 3,
        tgt: 5,
        pts: 50,
        team: false,
        deadline: "",
        assignee: "both",
        actIds: [6, 19], // Portare fuori Tia · Frutta o verdura
        since: today,
      },
    ],
    pays: [],
    income: [],
    wishes: [],
    badges: [],
    badgeAt: {},
  };
};

export const initUsers = (): Users => ({
  mia: mkU("Mia", P.mia, "👧🏻", P.miaG),
  samira: mkU("Samira", P.sam, "👧🏽", P.samG),
});

export const initMatches = (): Match[] => [
  {
    id: 1,
    name: "Chi legge di più",
    desc: "Sfida settimanale: chi completa più sessioni di lettura vince!",
    prize: "Scegliere il film del sabato sera 🎬",
    act: "Leggere 20min",
    durDays: 7,
    started: "2026-08-12",
    vis: true,
  },
];

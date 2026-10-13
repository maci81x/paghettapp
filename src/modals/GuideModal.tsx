import { useRef, useState } from "react";
import { LVLS, SPLIT, TIERS, YIELD_YEAR } from "../data/constants";
import { Btn, Modal } from "../design/components";
import { P, alpha } from "../design/tokens";

const pct = (f: number) => `${Math.round(f * 100)}%`;

/** Pagine della guida: una per argomento, scorrevoli col dito o coi bottoni. */
const PAGES: { i: string; t: string; lines: string[] }[] = [
  {
    i: "👋",
    t: "Come funziona",
    lines: [
      "Fai le attività di casa, scuola e famiglia e guadagni punti.",
      "Babbo Roby approva quello che hai segnato: i punti arrivano allora.",
      "A fine settimana i punti diventano la paghetta, divisa nei tuoi tre salvadanai.",
    ],
  },
  {
    i: "📋",
    t: "Attività",
    lines: [
      "Tocca ✅ Fatto! e indica quante volte, quando e se l'hai fatta oggi o ieri.",
      "Puoi allegare una 📸 foto-prova e correggere la nota finché non è approvata.",
      "Le attività ⚡ sono sfide: punti doppi e nessuna penalità se non le fai.",
      "Le attività con ⚠️ tolgono punti se ti dimentichi di farle.",
    ],
  },
  {
    i: "🪙",
    t: "Paghetta",
    lines: [
      "La settimana va da lunedì a domenica: contano i giorni in cui hai fatto le attività.",
      ...TIERS.map((t, k) => `${t.min}${k === TIERS.length - 1 ? "+" : `–${t.max}`} punti → €${t.r}`),
      "Il lunedì la settimana si chiude e Babbo Roby conferma la paghetta.",
    ],
  },
  {
    i: "🐷",
    t: "Salvadanai",
    lines: [
      `🏦 Risparmio ${pct(SPLIT.risparmio)} · 🎒 Personale ${pct(SPLIT.personale)} · 🤝 Beneficenza ${pct(SPLIT.beneficenza)}.`,
      "Ogni paghetta si divide da sola in questi tre salvadanai.",
      'Scrivi dove tieni davvero i soldi (es. "barattolo sulla scrivania") nella nota del salvadanaio.',
    ],
  },
  {
    i: "💸",
    t: "Spese",
    lines: [
      "⏳ La farò: annoti cosa vuoi comprare e quanto pensi di spendere. Il saldo non cambia.",
      "Quando hai speso davvero, tocca la spesa nel Wallet e scrivi quanto è costata.",
      "Solo allora i soldi escono dal salvadanaio: così vedi se hai speso più o meno del previsto.",
    ],
  },
  {
    i: "⭐",
    t: "Livelli",
    lines: [...LVLS.map((l) => `${l.i} ${l.n} (da ${l.min} pt): ${l.d}`), "I punti totali non si azzerano mai."],
  },
  {
    i: "🎯",
    t: "Missioni",
    lines: [
      'Obiettivi speciali con un premio in punti, come "5 attività di Relazioni in una settimana".',
      "Le missioni di squadra si fanno insieme: i progressi di tutte e due si sommano.",
      "⚔️ Nei match sfidi tua sorella: vince chi fa più punti nel periodo.",
    ],
  },
  {
    i: "📈",
    t: "Investimenti",
    lines: [
      `Il Risparmio cresce come se fosse investito in borsa: circa il ${pct(YIELD_YEAR)} all'anno (media storica S&P 500).`,
      "Gli interessi si aggiungono da soli ogni mese.",
      "Nel simulatore scegli per quanti anni bloccarli e quanto aggiungere al mese, e vedi quanto diventano.",
    ],
  },
];

export default function GuideModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const touchX = useRef<number | null>(null);
  const go = (n: number) => setPage(Math.max(0, Math.min(PAGES.length - 1, n)));
  const p = PAGES[page];
  const last = page === PAGES.length - 1;

  return (
    <Modal onClose={onClose}>
      <div
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(page + (dx < 0 ? 1 : -1));
          touchX.current = null;
        }}
        style={{ minHeight: 260 }}
      >
        <p style={{ fontSize: 40, textAlign: "center", margin: "4px 0 6px" }}>{p.i}</p>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5, textAlign: "center" }}>{p.t}</h2>
        {p.lines.map((l) => (
          <p key={l} style={{ color: P.tx2, fontSize: 12, margin: "0 0 8px", lineHeight: 1.55 }}>
            {l}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 6, margin: "12px 0" }}>
        {PAGES.map((x, k) => (
          <button
            key={x.t}
            aria-label={`Pagina ${k + 1}: ${x.t}`}
            onClick={() => go(k)}
            style={{
              width: k === page ? 18 : 8,
              height: 8,
              borderRadius: 4,
              border: "none",
              padding: 0,
              background: k === page ? P.acc : alpha(P.tx3, 40),
              transition: "all .3s",
              cursor: "pointer",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <Btn style={{ flex: 1, minHeight: 48 }} outline color={P.tx3} onClick={() => (page === 0 ? onClose() : go(page - 1))}>
          {page === 0 ? "Chiudi" : "‹ Indietro"}
        </Btn>
        <Btn style={{ flex: 1, minHeight: 48 }} grad={P.accG} onClick={() => (last ? onClose() : go(page + 1))}>
          {last ? "Ho capito!" : "Avanti ›"}
        </Btn>
      </div>
    </Modal>
  );
}

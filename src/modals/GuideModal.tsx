import { Btn, GlassCard, Modal } from "../design/components";
import { P } from "../design/tokens";

const ITEMS = [
  { t: "🏠 Home", d: "Punti di oggi e della settimana, paghetta, salvadanai." },
  { t: "📋 Attività", d: "Segna fatte, indica quante volte e quando. ⚡ = Sfida!" },
  { t: "🎯 Missioni", d: "Obiettivi bonus. Match: sfide tra sorelle." },
  { t: "💰 Wallet", d: "Entrate, spese, grafici per periodo." },
  { t: "📈 Investi", d: "Simula la crescita dei risparmi (S&P 500 ~10%/a)." },
  { t: "⭐ Profilo", d: "Livelli, cambio avatar e PIN." },
];

export default function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 14px", letterSpacing: -0.5 }}>📖 Guida</h2>
      {ITEMS.map((g) => (
        <GlassCard key={g.t} style={{ marginBottom: 6, padding: 12 }}>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 12, margin: "0 0 2px" }}>{g.t}</p>
          <p style={{ color: P.tx2, fontSize: 11, margin: 0, lineHeight: 1.5 }}>{g.d}</p>
        </GlassCard>
      ))}
      <Btn full grad={P.accG} onClick={onClose}>
        Ho capito!
      </Btn>
    </Modal>
  );
}

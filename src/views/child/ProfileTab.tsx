import { BADGES, FUND_LABEL, LVLS, getLvl } from "../../data/constants";
import { weeklyAvg } from "../../data/report";
import type { User, Wish } from "../../data/types";
import { Btn, GlassCard, InfoTip } from "../../design/components";
import { P } from "../../design/tokens";

const STARS = { 1: "⭐⭐⭐", 2: "⭐⭐", 3: "⭐" } as const;

export default function ProfileTab({
  u,
  uc,
  tp,
  wp,
  onAvatar,
  onPin,
  onAddWish,
  onEditWish,
  onDelWish,
  onBuyWish,
}: {
  u: User;
  uc: string;
  tp: number;
  wp: number;
  onAvatar: () => void;
  onPin: () => void;
  onAddWish: () => void;
  onEditWish: (w: Wish) => void;
  onDelWish: (w: Wish) => void;
  onBuyWish: (w: Wish) => void;
}) {
  const lvl = getLvl(u.totalPts);
  const wishes = [...(u.wishes ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority);
  const avg = weeklyAvg(u);
  const badges = u.badges ?? [];
  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div
          onClick={onAvatar}
          style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            background: u.grad,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 34,
            margin: "0 auto 6px",
            boxShadow: `0 8px 28px ${uc}33`,
            cursor: "pointer",
            position: "relative",
          }}
        >
          {u.av}
          <div
            style={{
              position: "absolute",
              bottom: -2,
              right: -2,
              width: 20,
              height: 20,
              borderRadius: 8,
              background: P.accG,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
            }}
          >
            ✏️
          </div>
        </div>
        <p style={{ color: P.tx, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>{u.n}</p>
        <p style={{ color: P.tx2, fontSize: 11, margin: 0 }}>
          {lvl.i} {lvl.n} · {u.totalPts}pt
        </p>
      </div>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>
          ⭐ Livelli <InfoTip text="I punti totali non si resettano. Sali accumulandoli!" />
        </p>
        {LVLS.map((l) => (
          <div key={l.n} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", opacity: u.totalPts >= l.min ? 1 : 0.25 }}>
            <span style={{ fontSize: 22 }}>{l.i}</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: l.c, fontWeight: 700, fontSize: 13 }}>{l.n}</span>
              <span style={{ color: P.tx3, fontSize: 9, marginLeft: 6 }}>
                {l.min}–{l.max < 999999 ? l.max : "∞"}
              </span>
            </div>
            {u.totalPts >= l.min && u.totalPts <= l.max && (
              <span style={{ background: l.c + "1a", color: l.c, padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>Tu sei qui</span>
            )}
          </div>
        ))}
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>
          🏅 Badge <InfoTip text="Si sbloccano da soli quando raggiungi il traguardo." />
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {BADGES.map((b) => {
            const got = badges.includes(b.id);
            return (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 7,
                  borderRadius: 10,
                  background: got ? uc + "12" : P.glass,
                  border: `1px solid ${got ? uc + "44" : P.gb}`,
                  opacity: got ? 1 : 0.5,
                }}
              >
                <span style={{ fontSize: 18, filter: got ? "none" : "grayscale(1)" }}>{b.i}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: got ? P.tx : P.tx3, fontSize: 10, fontWeight: 700, margin: 0 }}>{b.n}</p>
                  <p style={{ color: P.tx3, fontSize: 8, margin: 0, lineHeight: 1.3 }}>{got ? (u.badgeAt?.[b.id] ?? "sbloccato") : b.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: 0 }}>🎁 Lista Desideri</p>
          <Btn small grad={P.mintG} onClick={onAddWish}>
            + Aggiungi
          </Btn>
        </div>
        {wishes.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, textAlign: "center", padding: 10 }}>Nessun desiderio in lista</p>
        ) : (
          wishes.map((w) => {
            const bal = u.w[w.fund];
            const pct = Math.min(100, (bal / w.cost) * 100);
            const missing = +(w.cost - bal).toFixed(2);
            const weeks = avg > 0 && missing > 0 ? Math.ceil(missing / avg) : null;
            return (
              <div key={w.id} style={{ padding: "8px 0", borderBottom: `1px solid ${P.gb}`, opacity: w.done ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: P.tx, fontSize: 12, fontWeight: 600, margin: 0 }}>
                      {w.done ? "✅ " : ""}
                      {w.name} <span style={{ color: P.tx3, fontSize: 10 }}>{STARS[w.priority]}</span>
                    </p>
                    <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>
                      €{w.cost.toFixed(2)} · {FUND_LABEL[w.fund]}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {!w.done && (
                      <Btn small grad={P.mintG} disabled={bal < w.cost} onClick={() => onBuyWish(w)}>
                        🛒
                      </Btn>
                    )}
                    <Btn small color={P.blue} onClick={() => onEditWish(w)}>
                      ✏️
                    </Btn>
                    <Btn small color={P.red} onClick={() => onDelWish(w)}>
                      🗑
                    </Btn>
                  </div>
                </div>
                {!w.done && (
                  <>
                    <div style={{ background: P.glass, borderRadius: 3, height: 5, marginTop: 5 }}>
                      <div style={{ background: pct >= 100 ? P.mintG : uc, borderRadius: 3, height: 5, width: `${pct}%`, transition: "width .5s" }} />
                    </div>
                    <p style={{ fontSize: 9, color: missing <= 0 ? P.mint : P.tx3, margin: "3px 0 0" }}>
                      {missing <= 0 ? "✅ Puoi comprarlo!" : `Mancano €${missing.toFixed(2)}${weeks ? ` · ~${weeks} settiman${weeks === 1 ? "a" : "e"}` : ""}`}
                    </p>
                  </>
                )}
              </div>
            );
          })
        )}
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>📊 Riepilogo</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>Oggi</p>
            <p style={{ color: P.mint, fontSize: 20, fontWeight: 800, margin: 0 }}>+{tp}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>Settimana</p>
            <p style={{ color: P.gold, fontSize: 20, fontWeight: 800, margin: 0 }}>+{wp}</p>
          </div>
        </div>
      </GlassCard>

      <Btn full outline color={P.gold} style={{ marginTop: 4 }} onClick={onPin}>
        🔑 Cambia PIN
      </Btn>
    </div>
  );
}

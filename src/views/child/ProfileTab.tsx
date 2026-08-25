import { useRef, useState } from "react";
import { BADGES, FUNDS, FUND_LABEL, FUND_NAME_MAX, FUND_NAME_MIN, LVLS, fundName, getLvl, validFundName } from "../../data/constants";
import { weeklyAvg } from "../../data/report";
import type { Fund, User, Wish } from "../../data/types";
import { Avatar, Btn, GlassCard, InfoTip, Input } from "../../design/components";
import { BG_PATTERNS, COLOR_PRESETS, userGrad, userName } from "../../design/theme";
import { P } from "../../design/tokens";

const STARS = { 1: "⭐⭐⭐", 2: "⭐⭐", 3: "⭐" } as const;

export default function ProfileTab({
  u,
  uc,
  tp,
  wp,
  onAvatar,
  onPin,
  onPhoto,
  onRemovePhoto,
  onTheme,
  onBg,
  onNickname,
  piggyNames,
  onPiggyName,
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
  onPhoto: (file: File) => Promise<void>;
  onRemovePhoto: () => void;
  onTheme: (c: { from: string; to: string }) => void;
  onBg: (value: string) => void;
  onNickname: (name: string) => void;
  /** Falso finché il database non ha la colonna dei nomi: la sezione resta nascosta. */
  piggyNames: boolean;
  onPiggyName: (fund: Fund, name: string) => void;
  onAddWish: () => void;
  onEditWish: (w: Wish) => void;
  onDelWish: (w: Wish) => void;
  onBuyWish: (w: Wish) => void;
}) {
  const lvl = getLvl(u.totalPts);
  const grad = userGrad(u);
  const wishes = [...(u.wishes ?? [])].sort((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority);
  const avg = weeklyAvg(u);
  const badges = u.badges ?? [];

  const fileRef = useRef<HTMLInputElement>(null);
  const [photoErr, setPhotoErr] = useState("");
  const [editName, setEditName] = useState(false);
  const [name, setName] = useState(userName(u));
  const [editFund, setEditFund] = useState<Fund | null>(null);
  const [fundDraft, setFundDraft] = useState("");

  const saveFund = (k: Fund) => {
    if (!validFundName(fundDraft)) return;
    onPiggyName(k, fundDraft.trim());
    setEditFund(null);
  };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoErr("");
    try {
      await onPhoto(file);
    } catch {
      setPhotoErr("Non riesco a leggere questa immagine, provane un'altra.");
    }
  };

  const saveName = () => {
    onNickname(name);
    setEditName(false);
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 8px" }}>
          <Avatar
            photo={u.profilePhoto}
            emoji={u.av}
            size={120}
            radius={34}
            grad={grad}
            onClick={() => fileRef.current?.click()}
            style={{ boxShadow: `0 10px 32px ${uc}44`, border: `3px solid ${uc}` }}
          />
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              borderBottomLeftRadius: 34,
              borderBottomRightRadius: 34,
              background: "rgba(0,0,0,.55)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              padding: "4px 0",
              cursor: "pointer",
            }}
          >
            📷 Cambia
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={(e) => {
            void pickPhoto(e.target.files?.[0]);
            e.target.value = ""; // così riselezionare la stessa foto rilancia l'evento
          }}
        />
        {photoErr && <p style={{ color: P.red, fontSize: 10, margin: "0 0 6px" }}>{photoErr}</p>}

        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
          <Btn small outline color={P.tx3} onClick={onAvatar}>
            😀 Emoji
          </Btn>
          {u.profilePhoto && (
            <Btn small outline color={P.red} onClick={onRemovePhoto}>
              🗑️ Rimuovi foto
            </Btn>
          )}
        </div>

        {editName ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", maxWidth: 240, margin: "0 auto" }}>
            <Input value={name} maxLength={15} onChange={(e) => setName(e.target.value)} style={{ textAlign: "center" }} />
            <Btn small grad={grad} onClick={saveName}>
              ✓
            </Btn>
          </div>
        ) : (
          <p
            onClick={() => {
              setName(userName(u));
              setEditName(true);
            }}
            style={{ color: P.tx, fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: -0.5, cursor: "pointer" }}
          >
            {userName(u)} <span style={{ fontSize: 11 }}>✏️</span>
          </p>
        )}
        <p style={{ color: P.tx2, fontSize: 11, margin: 0 }}>
          {lvl.i} {lvl.n} · {u.totalPts}pt
        </p>
      </div>

      {piggyNames && (
        <GlassCard>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>
            🐷 I miei salvadanai <InfoTip text="Il nome è tuo: lo vedi ovunque nell'app, al posto dei nomi standard." />
          </p>
          {FUNDS.map((k) => {
            const editing = editFund === k;
            const tooShort = editing && fundDraft.trim().length > 0 && fundDraft.trim().length < FUND_NAME_MIN;
            return (
              <div key={k} style={{ padding: "7px 0", borderBottom: `1px solid ${P.gb}` }}>
                {editing ? (
                  <>
                    <p style={{ color: P.tx3, fontSize: 9, margin: "0 0 3px" }}>{FUND_LABEL[k]}</p>
                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                      <Input
                        value={fundDraft}
                        autoFocus
                        maxLength={FUND_NAME_MAX}
                        onChange={(e) => setFundDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveFund(k)}
                      />
                      <Btn small grad={P.mintG} disabled={!validFundName(fundDraft)} onClick={() => saveFund(k)}>
                        ✓
                      </Btn>
                      <Btn small outline color={P.tx3} onClick={() => setEditFund(null)}>
                        ✕
                      </Btn>
                    </div>
                    <p style={{ fontSize: 9, color: tooShort ? P.red : P.tx3, margin: "3px 0 0" }}>
                      {tooShort ? `Almeno ${FUND_NAME_MIN} caratteri` : `${fundDraft.trim().length}/${FUND_NAME_MAX}`}
                    </p>
                  </>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: P.tx, fontSize: 12, fontWeight: 600, margin: 0 }}>{fundName(u, k)}</p>
                      <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>{FUND_LABEL[k]}</p>
                    </div>
                    <Btn
                      small
                      color={P.blue}
                      onClick={() => {
                        setFundDraft(u.wNick?.[k] ?? "");
                        setEditFund(k);
                      }}
                    >
                      ✏️
                    </Btn>
                  </div>
                )}
              </div>
            );
          })}
        </GlassCard>
      )}

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>🎨 I miei colori</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {COLOR_PRESETS.map((c) => {
            const active = u.themeColors?.from === c.from && u.themeColors?.to === c.to;
            return (
              <div key={c.name} onClick={() => onTheme({ from: c.from, to: c.to })} style={{ textAlign: "center", cursor: "pointer" }}>
                <div
                  title={c.name}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    background: `linear-gradient(135deg,${c.from},${c.to})`,
                    border: active ? "3px solid #fff" : `1px solid ${P.gb}`,
                    boxShadow: active ? `0 0 12px ${c.from}88` : "none",
                  }}
                />
                <p style={{ fontSize: 8, color: active ? P.tx : P.tx3, margin: "3px 0 0" }}>{c.name}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>✨ Il mio sfondo</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {BG_PATTERNS.map((b) => {
            const active = (u.bgPattern ?? "none") === b.value;
            return (
              <div key={b.name} onClick={() => onBg(b.value)} style={{ textAlign: "center", cursor: "pointer" }}>
                <div
                  style={{
                    width: 60,
                    height: 40,
                    borderRadius: 8,
                    background: P.bg,
                    backgroundImage: b.value === "none" ? undefined : b.value,
                    backgroundSize: b.size,
                    border: active ? `2px solid ${uc}` : `1px solid ${P.gb}`,
                  }}
                />
                <p style={{ fontSize: 8, color: active ? P.tx : P.tx3, margin: "3px 0 0" }}>{b.name}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

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
              <span style={{ background: grad, color: "#fff", padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 700 }}>Tu sei qui</span>
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
          <Btn small grad={grad} onClick={onAddWish}>
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

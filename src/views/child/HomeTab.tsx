import { BONUS_ACT, CATS, FUNDS, SPLIT, TIERS, USER_IDS, YIELD_YEAR, getTier } from "../../data/constants";
import { missionProg } from "../../data/report";
import type { Activity, Fund, Payment, User, UserId, Users } from "../../data/types";
import { Avatar, Btn, GlassCard, InfoTip, Ring } from "../../design/components";
import { userColor, userName } from "../../design/theme";
import { P, gls } from "../../design/tokens";
import { weeklyGrowth, yearlyGrowth } from "../../utils/compoundInterest";

const FUND_HOME_LABEL: Record<Fund, string> = {
  risparmio: `🏦 Risparmio (${SPLIT.risparmio * 100}%)`,
  personale: `🎒 Personale (${SPLIT.personale * 100}%)`,
  beneficenza: `🤝 Beneficenza (${SPLIT.beneficenza * 100}%)`,
};

/** Traguardo successivo del risparmio, a scatti di €100: alimenta la barra di crescita. */
const nextMilestone = (v: number) => Math.max(100, Math.ceil(v / 100) * 100 || 100);

export default function HomeTab({
  u,
  au,
  users,
  uc,
  grad,
  tp,
  wp,
  acts,
  todayDone,
  weekPtsOf,
  paid,
  onNote,
  onIncome,
  onSpesa,
}: {
  u: User;
  au: UserId;
  users: Users;
  uc: string;
  grad: string;
  tp: number;
  wp: number;
  acts: Activity[];
  todayDone: (actId: number) => number;
  weekPtsOf: (uid: UserId) => number;
  paid?: Payment;
  onNote: (fund: Fund, note: string) => void;
  onIncome: () => void;
  onSpesa: () => void;
}) {
  const tier = getTier(wp);
  const weekPct = Math.min(100, (wp / 500) * 100);
  const gap = Math.max(0, 500 - wp);
  const suggestions = acts.filter((a) => todayDone(a.id) < a.max).sort((a, b) => b.pts - a.pts).slice(0, 3);

  // promemoria: attività giornaliere non ancora segnate oggi
  const todo = acts.filter((a) => a.freq === "daily" && todayDone(a.id) === 0).sort((a, b) => b.pts - a.pts);
  const todoTop = todo.slice(0, 5);

  // classifica settimanale fra sorelle
  const board = USER_IDS.map((uid) => ({
    uid,
    n: userName(users[uid]),
    av: users[uid].av,
    photo: users[uid].profilePhoto,
    c: userColor(users[uid]),
    pts: weekPtsOf(uid),
  })).sort((a, b) => b.pts - a.pts);
  const tie = board[0].pts === board[1].pts;
  const me = board.find((b) => b.uid === au)!;
  const other = board.find((b) => b.uid !== au)!;
  const diff = Math.abs(me.pts - other.pts);

  // rendimento stimato sul salvadanaio risparmio (interesse composto)
  const save = u.w.risparmio;
  const perWeek = weeklyGrowth(save, YIELD_YEAR);
  const perYear = yearlyGrowth(save, YIELD_YEAR);
  const goal = nextMilestone(save);

  const bonuses = u.log.filter((l) => l.actId === BONUS_ACT).slice(-3).reverse();

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 12,
          borderRadius: 16,
          marginBottom: 14,
          background: `linear-gradient(135deg,${uc}22,transparent)`,
          border: `1px solid ${uc}33`,
        }}
      >
        <Avatar photo={u.profilePhoto} emoji={u.av} size={48} grad={grad} />
        <div>
          <p style={{ color: P.tx, fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Ciao, {userName(u)}! 👋</p>
          <p style={{ color: P.tx3, fontSize: 10, margin: 0 }}>🔥 {u.streak} giorni di fila</p>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Ring pct={weekPct} size={156} stroke={10} color={uc} glow>
          <p style={{ fontSize: 34, fontWeight: 800, margin: 0, letterSpacing: -2, color: P.tx }}>{wp}</p>
          <p style={{ fontSize: 10, color: P.tx3, margin: 0 }}>punti settimana</p>
        </Ring>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <GlassCard style={{ textAlign: "center", padding: 12 }}>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>OGGI</p>
          <p style={{ fontSize: 26, fontWeight: 800, margin: 0, background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>+{tp}</p>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>punti</p>
        </GlassCard>
        <GlassCard style={{ textAlign: "center", padding: 12 }}>
          <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>PAGHETTA</p>
          <p style={{ fontSize: 26, fontWeight: 800, margin: 0, background: P.goldG, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            €{(paid ? paid.amount : tier.r).toFixed(2).replace(".00", "")}
          </p>
          <p style={{ color: paid ? P.mint : P.tx3, fontSize: 9, margin: 0 }}>{paid ? "✓ accreditata" : `🔥 ${u.streak}gg streak`}</p>
        </GlassCard>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Btn style={{ flex: 1 }} grad={grad} onClick={onIncome}>
          💝 Registra entrata
        </Btn>
        <Btn style={{ flex: 1 }} color={P.red} onClick={onSpesa}>
          💸 Registra uscita
        </Btn>
      </div>

      <GlassCard style={{ background: `linear-gradient(135deg,${P.gold}06,transparent)`, border: `1px solid ${P.gold}15` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ color: P.tx, fontSize: 12, fontWeight: 700 }}>🎯 Per arrivare a €15</span>
          <span style={{ color: gap === 0 ? P.mint : P.gold, fontSize: 14, fontWeight: 800 }}>{gap === 0 ? "🏆 Raggiunto!" : ` ${gap}pt`}</span>
        </div>
        {gap > 0 && (
          <>
            <div style={{ background: P.glass, borderRadius: 4, height: 6, marginBottom: 8 }}>
              <div style={{ background: grad, borderRadius: 4, height: 6, width: `${weekPct}%`, transition: "width .5s" }} />
            </div>
            <p style={{ color: P.tx3, fontSize: 10, margin: "0 0 4px" }}>💡 Prova queste attività:</p>
            {suggestions.map((a) => {
              const cat = CATS.find((c) => c.id === a.cat);
              return (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
                  <span style={{ color: P.tx }}>
                    {cat?.i} {a.name}
                  </span>
                  <span style={{ color: P.mint, fontWeight: 700 }}>+{a.pts}pt</span>
                </div>
              );
            })}
          </>
        )}
      </GlassCard>

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>📋 Da fare oggi</p>
        {todo.length === 0 ? (
          <p style={{ color: P.mint, fontSize: 12, textAlign: "center", padding: 8, margin: 0 }}>🎉 Tutto fatto oggi! Grande!</p>
        ) : (
          <>
            {todoTop.map((a) => {
              const cat = CATS.find((c) => c.id === a.cat);
              return (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11, borderBottom: `1px solid ${P.gb}` }}>
                  <span style={{ color: P.tx }}>
                    {cat?.i} {a.name}
                  </span>
                  <span style={{ color: P.mint, fontWeight: 700 }}>+{a.pts}pt</span>
                </div>
              );
            })}
            {todo.length > todoTop.length && (
              <p style={{ color: P.tx3, fontSize: 10, margin: "6px 0 0" }}>…e altre {todo.length - todoTop.length}</p>
            )}
          </>
        )}
      </GlassCard>

      <GlassCard style={{ background: `linear-gradient(135deg,${P.mia}06,${P.sam}06)` }}>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>🏆 Classifica settimana</p>
        {board.map((b, i) => (
          <div key={b.uid} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Avatar photo={b.photo} emoji={b.av} size={30} grad={b.c + "33"} />
              <span style={{ color: b.uid === au ? P.tx : P.tx2, fontSize: 12, fontWeight: b.uid === au ? 700 : 500 }}>
                {!tie && i === 0 ? "👑 " : ""}
                {b.n}
              </span>
            </div>
            <span style={{ color: b.c, fontWeight: 800, fontSize: 14 }}>{b.pts}pt</span>
          </div>
        ))}
        <p style={{ color: P.tx3, fontSize: 10, margin: "6px 0 0", textAlign: "center" }}>
          {tie ? "Testa a testa! 🤝" : me.pts > other.pts ? `Sei avanti di ${diff} punti` : `Ti mancano ${diff} punti per raggiungere ${other.n}`}
        </p>
      </GlassCard>

      <GlassCard style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 2 }}>
          {TIERS.map((t) => (
            <div key={t.r} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 6, borderRadius: 3, background: wp >= t.min ? uc + "aa" : P.glass, transition: "all .3s" }} />
              <p style={{ fontSize: 8, color: wp >= t.min ? P.tx : P.tx3, margin: "3px 0 0", fontWeight: 600 }}>€{t.r}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {bonuses.length > 0 && (
        <GlassCard style={{ background: `linear-gradient(135deg,${P.gold}08,transparent)`, border: `1px solid ${P.gold}1a` }}>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>🎁 Punti bonus</p>
          {bonuses.map((l) => (
            <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 11 }}>
              <span style={{ color: P.tx2 }}>{l.note}</span>
              <span style={{ color: l.pts >= 0 ? P.mint : P.red, fontWeight: 700 }}>
                {l.pts >= 0 ? "+" : ""}
                {l.pts}pt
              </span>
            </div>
          ))}
        </GlassCard>
      )}

      <GlassCard>
        <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 8px" }}>
          💰 Salvadanai <InfoTip text="30% Risparmio, 60% Personale, 10% Beneficenza. Indica dove li tieni!" />
        </p>
        {FUNDS.map((k) => (
          <div key={k} style={{ padding: "8px 0", borderBottom: `1px solid ${P.gb}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: P.tx }}>{FUND_HOME_LABEL[k]}</span>
              <span style={{ color: P.mint, fontWeight: 700, fontSize: 15 }}>€{u.w[k].toFixed(2)}</span>
            </div>
            {k === "risparmio" && (
              <>
                <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: P.mint, fontWeight: 700 }}>+€{perWeek.toFixed(2)}/sett</span>
                  <span style={{ fontSize: 10, color: P.gold, fontWeight: 700 }}>+€{perYear.toFixed(2)}/anno</span>
                </div>
                <div style={{ background: P.glass, borderRadius: 3, height: 5, marginTop: 4 }}>
                  <div style={{ background: P.mintG, borderRadius: 3, height: 5, width: `${Math.min(100, (save / goal) * 100)}%`, transition: "width .6s" }} />
                </div>
                <p style={{ fontSize: 9, color: P.tx3, margin: "3px 0 0" }}>Prossimo traguardo: €{goal}</p>
                <p style={{ fontSize: 9, color: P.tx2, margin: "4px 0 0", lineHeight: 1.4 }}>
                  📈 I tuoi risparmi crescono con l'interesse composto! Babbo Roby li investe: rendimento medio ~{YIELD_YEAR * 100}%/anno.
                </p>
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
              <span style={{ fontSize: 9, color: P.tx3 }}>📍</span>
              <input
                value={u.wN[k]}
                onChange={(e) => onNote(k, e.target.value)}
                placeholder="Dove lo tieni?"
                style={{ flex: 1, ...gls, padding: "4px 8px", color: P.tx, fontSize: 10, borderRadius: 8 }}
              />
            </div>
          </div>
        ))}
      </GlassCard>

      {u.miss.length > 0 && (
        <GlassCard>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>
            🎯 Missioni <InfoTip text="Le missioni danno punti bonus quando le completi." />
          </p>
          {u.miss.map((m) => {
            const prog = missionProg(u, m);
            return (
              <div key={m.id} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: P.tx }}>{m.name}</span>
                  <span style={{ color: prog >= m.tgt ? P.mint : P.acc, fontWeight: 700 }}>
                    {prog}/{m.tgt}
                  </span>
                </div>
                <div style={{ background: P.glass, borderRadius: 3, height: 5, marginTop: 3 }}>
                  <div style={{ background: prog >= m.tgt ? P.mintG : P.accG, borderRadius: 3, height: 5, width: `${Math.min(100, (prog / m.tgt) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}

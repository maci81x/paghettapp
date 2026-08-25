import { useState } from "react";
import type { ComponentProps } from "react";
import {
  BONUS_ACT,
  CATS,
  DEDUCT_ACT,
  FUNDS,
  MANUAL_ACT_LABEL,
  SPLIT,
  TIERS,
  TIER_TICK,
  USER_IDS,
  YIELD_YEAR,
  getTier,
  nextTier as nextTierOf,
  tierPos,
  todayISO,
} from "../../data/constants";
import { missionProg } from "../../data/report";
import { nextMilestone } from "../../data/savings";
import type { Activity, Fund, IncomeEntry, Payment, User, UserId, Users } from "../../data/types";
import { Avatar, Btn, GlassCard, InfoTip, Ring } from "../../design/components";
import { userColor, userName } from "../../design/theme";
import { P, alpha, gls } from "../../design/tokens";
import { weeklyGrowth, yearlyGrowth } from "../../utils/compoundInterest";
import PendingApprovalCard from "./PendingApprovalCard";
import { fmtDay } from "../../utils/dates";

const FUND_HOME_LABEL: Record<Fund, string> = {
  risparmio: `🏦 Risparmio (${SPLIT.risparmio * 100}%)`,
  personale: `🎒 Personale (${SPLIT.personale * 100}%)`,
  beneficenza: `🤝 Beneficenza (${SPLIT.beneficenza * 100}%)`,
};

export default function HomeTab({
  pending,
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
  toConfirm,
  onConfirmIncome,
  onMark,
  onNote,
  onIncome,
  onSpesa,
}: {
  /** Card "In attesa di approvazione": condivisa con l'altra scheda. */
  pending: ComponentProps<typeof PendingApprovalCard>;
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
  /** Paghetta accreditata dall'admin e non ancora confermata dalla ragazza. */
  toConfirm?: IncomeEntry;
  onConfirmIncome: (id: number) => void;
  /** Apre il modale di completamento direttamente dalla Home. */
  onMark: (a: Activity) => void;
  onNote: (fund: Fund, note: string) => void;
  onIncome: () => void;
  onSpesa: () => void;
}) {
  const [notYet, setNotYet] = useState(false);
  const tier = getTier(wp);
  const nextTier = nextTierOf(wp);
  const gapTier = nextTier ? nextTier.min - wp : 0;
  const pos = tierPos(wp);
  const weekPct = Math.min(100, (wp / 500) * 100);
  const gap = Math.max(0, 500 - wp);
  const available = acts.filter((a) => todayDone(a.id) < a.max).sort((a, b) => b.pts - a.pts);
  const suggestions = available.slice(0, 3);
  // la più remunerativa ancora disponibile: è quella che si suggerisce di fare
  const best = available[0];

  // promemoria: attività giornaliere non ancora segnate oggi
  const todo = acts.filter((a) => a.freq === "daily" && todayDone(a.id) === 0).sort((a, b) => b.pts - a.pts);
  const todoTop = todo.slice(0, 5);

  // riepilogo di oggi: cosa ha segnato, in ordine di inserimento
  const doneToday = u.log
    .filter((l) => l.date === todayISO() && !l.revoked)
    .map((l) => ({ l, a: acts.find((x) => x.id === l.actId) }));

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

  // bonus e penalità: entrambi assegnati a mano dall'admin, entrambi da mostrare
  const bonuses = u.log.filter((l) => (l.actId === BONUS_ACT || l.actId === DEDUCT_ACT) && !l.revoked).slice(-3).reverse();

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

      <PendingApprovalCard {...pending} />

      {toConfirm && (
        <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.gold, 12)},transparent)`, border: `1.5px solid ${alpha(P.gold, 33)}` }}>
          <p style={{ color: P.tx, fontWeight: 800, fontSize: 15, margin: "0 0 4px", letterSpacing: -0.3 }}>
            💰 Hai ricevuto la paghetta di €{toConfirm.amount.toFixed(2)}?
          </p>
          <p style={{ color: P.tx3, fontSize: 10, margin: "0 0 10px" }}>Accreditata il {fmtDay(toConfirm.date)} · confermala quando hai i soldi in mano</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn style={{ flex: 1 }} grad={P.mintG} onClick={() => onConfirmIncome(toConfirm.id)}>
              ✅ Sì, ricevuta!
            </Btn>
            <Btn style={{ flex: 1 }} outline color={P.tx3} onClick={() => setNotYet(true)}>
              ❌ Non ancora
            </Btn>
          </div>
          {notYet && (
            <p style={{ color: P.tx2, fontSize: 10, margin: "8px 0 0", lineHeight: 1.4 }}>
              Nessun problema: chiedi a Babbo Roby. La domanda resta qui finché non confermi.
            </p>
          )}
        </GlassCard>
      )}

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Ring pct={weekPct} size={156} stroke={10} color={uc} glow>
          <p style={{ fontSize: 34, fontWeight: 800, margin: 0, letterSpacing: -2, color: P.tx }}>{wp}</p>
          <p style={{ fontSize: 10, color: P.tx3, margin: 0 }}>punti settimana</p>
        </Ring>
      </div>

      <GlassCard style={{ textAlign: "center", padding: 12, marginBottom: 8 }}>
        <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>OGGI</p>
        <p style={{ fontSize: 26, fontWeight: 800, margin: 0, background: grad, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>+{tp}</p>
        <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>punti</p>
      </GlassCard>

      {/*
        A scaglioni la cifra da sola inganna: con 0 punti "€2" si legge come
        "ho già €2", non come "€2 è il minimo di fine settimana". Il testo che
        conta è quanto manca al traguardo dopo, quindi è quello grande.
      */}
      <GlassCard
        style={{
          textAlign: "center",
          padding: 16,
          marginBottom: 8,
          background: `linear-gradient(135deg,${alpha(P.gold, 6)},transparent)`,
          border: `1.5px solid ${alpha(P.gold, 18)}`,
        }}
      >
        <p style={{ color: P.tx3, fontSize: 9, margin: 0, letterSpacing: 0.2 }}>{paid ? "PAGHETTA" : "PAGHETTA IN CORSO"}</p>
        <p style={{ fontSize: 32, fontWeight: 800, margin: "2px 0 0", letterSpacing: -1, background: P.goldG, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          €{(paid ? paid.amount : tier.r).toFixed(2).replace(".00", "")}
        </p>

        {paid ? (
          <p style={{ color: P.mint, fontSize: 11, fontWeight: 700, margin: "4px 0 0" }}>✓ accreditata</p>
        ) : wp <= 0 ? (
          <p style={{ color: P.acc, fontSize: 16, fontWeight: 800, margin: "6px 0 0", lineHeight: 1.35 }}>
            🎯 Questa settimana parti da €{TIERS[0].r} — fai attività per guadagnare di più!
          </p>
        ) : nextTier ? (
          <>
            <p style={{ color: P.tx3, fontSize: 10, margin: "2px 0 0" }}>con {wp}pt della settimana</p>
            <p style={{ color: P.acc, fontSize: 16, fontWeight: 800, margin: "6px 0 0", lineHeight: 1.35 }}>
              Mancano {gapTier}pt per arrivare a €{nextTier.r}
            </p>
            {best && (
              <p style={{ color: P.tx2, fontSize: 11, margin: "5px 0 0", lineHeight: 1.4 }}>
                Fai {CATS.find((c) => c.id === best.cat)?.i} <b style={{ color: P.tx }}>{best.name}</b> per +{best.pts}pt!
              </p>
            )}
          </>
        ) : (
          <p style={{ color: P.mint, fontSize: 16, fontWeight: 800, margin: "6px 0 0", lineHeight: 1.35 }}>🏆 Hai raggiunto il massimo: €{tier.r}!</p>
        )}
      </GlassCard>

      <GlassCard style={{ background: `linear-gradient(135deg,${uc}10,transparent)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ color: P.tx, fontSize: 13, fontWeight: 700 }}>☀️ Oggi hai guadagnato</span>
          <span style={{ color: P.mint, fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{tp}pt</span>
        </div>
        {doneToday.length === 0 ? (
          <p style={{ color: P.tx3, fontSize: 11, margin: "6px 0 0" }}>Non hai ancora segnato niente oggi — comincia da "Da fare oggi" 👇</p>
        ) : (
          <div style={{ marginTop: 6 }}>
            {doneToday.map(({ l, a }) => {
              const cat = a ? CATS.find((c) => c.id === a.cat) : undefined;
              const name = a?.name ?? MANUAL_ACT_LABEL[l.actId] ?? "Attività";
              return (
                <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 11 }}>
                  <span style={{ color: P.tx2 }}>
                    {cat?.i ?? ""} {name}
                    {l.cnt > 1 ? ` ×${l.cnt}` : ""}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: l.pts >= 0 ? P.mint : P.red, fontWeight: 700 }}>
                      {l.pts >= 0 ? "+" : ""}
                      {l.pts}pt
                    </span>
                    <span style={{ fontSize: 9, color: l.ok ? P.mint : P.gold }}>{l.ok ? "✅" : "⏳"}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Barra tier: dove sono adesso e cosa manca al traguardo dopo. */}
      <GlassCard style={{ padding: 16, marginBottom: 8 }}>
        <div style={{ padding: "0 22px" }}>
          <div style={{ position: "relative", height: 18 }}>
            <div style={{ position: "absolute", top: 6, left: 0, right: 0, height: 6, borderRadius: 3, background: P.glass }} />
            <div style={{ position: "absolute", top: 6, left: 0, width: `${pos}%`, height: 6, borderRadius: 3, background: grad, transition: "width .6s" }} />
            {TIERS.map((t, i) => (
              <div
                key={t.r}
                style={{
                  position: "absolute",
                  top: 1,
                  left: `${i * TIER_TICK}%`,
                  transform: "translateX(-50%)",
                  boxSizing: "content-box",
                  width: 12,
                  height: 12,
                  borderRadius: 8,
                  background: wp >= t.min ? uc : P.glass,
                  border: `2px solid ${P.bg}`,
                  transition: "background .3s",
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                top: -1,
                left: `${pos}%`,
                transform: "translateX(-50%)",
                boxSizing: "content-box",
                width: 14,
                height: 14,
                borderRadius: 10,
                background: grad,
                border: `3px solid ${P.bg}`,
                boxShadow: `0 0 10px ${alpha(uc, 55)}`,
                transition: "left .6s",
              }}
            />
          </div>
          <div style={{ position: "relative", height: 26, marginTop: 6 }}>
            {TIERS.map((t, i) => (
              <div key={t.r} style={{ position: "absolute", left: `${i * TIER_TICK}%`, transform: "translateX(-50%)", width: 44, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: wp >= t.min ? P.tx : P.tx3 }}>€{t.r}</p>
                <p style={{ margin: 0, fontSize: 8, color: P.tx3 }}>{t.min}pt</p>
              </div>
            ))}
          </div>
        </div>
        <p style={{ margin: 0, textAlign: "center", fontSize: 10, color: P.tx2 }}>
          {nextTier ? (
            <>
              Sei a <b style={{ color: P.tx }}>{wp}pt</b> • Mancano <b style={{ color: uc }}>{gapTier}pt</b> per €{nextTier.r}
            </>
          ) : (
            "🏆 Sei al massimo!"
          )}
        </p>
      </GlassCard>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Btn style={{ flex: 1 }} grad={grad} onClick={onIncome}>
          💝 Registra entrata
        </Btn>
        <Btn style={{ flex: 1 }} color={P.red} onClick={onSpesa}>
          💸 Registra uscita
        </Btn>
      </div>

      <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.gold, 2)},transparent)`, border: `1px solid ${alpha(P.gold, 8)}` }}>
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
                <div
                  key={a.id}
                  onClick={() => onMark(a)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    fontSize: 11,
                    borderBottom: `1px solid ${P.gb}`,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ color: P.tx }}>
                    {cat?.i} {a.name}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: P.mint, fontWeight: 700 }}>+{a.pts}pt</span>
                    <span style={{ color: uc, fontSize: 10, fontWeight: 700 }}>✅ Fatto!</span>
                  </span>
                </div>
              );
            })}
            {todo.length > todoTop.length && (
              <p style={{ color: P.tx3, fontSize: 10, margin: "6px 0 0" }}>…e altre {todo.length - todoTop.length}</p>
            )}
          </>
        )}
      </GlassCard>

      <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.mia, 2)},${alpha(P.sam, 2)})` }}>
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

      {bonuses.length > 0 && (
        <GlassCard style={{ background: `linear-gradient(135deg,${alpha(P.gold, 3)},transparent)`, border: `1px solid ${alpha(P.gold, 10)}` }}>
          <p style={{ color: P.tx, fontWeight: 700, fontSize: 13, margin: "0 0 6px" }}>🎁 Punti bonus e penalità</p>
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

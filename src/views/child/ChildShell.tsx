import { Suspense, lazy, useState } from "react";
import { FREQ_UNIT, fundName, getLvl, hasFundNames, nowTod, penaltiesOf, todayISO } from "../../data/constants";
import type { Activity, ChildTab, CompletionDraft, Fund, LogEntry, Period, SpesaDraft, UserId, Wish, WishDraft } from "../../data/types";
import { Avatar, NavItem } from "../../design/components";
import { bgSizeFor, userColor, userGrad, userName } from "../../design/theme";
import { P } from "../../design/tokens";
import type { MatchesApi } from "../../hooks/useMatches";
import type { ActivitiesApi, UsersApi } from "../../hooks/useSupabase";
import AvatarPicker from "../../modals/AvatarPicker";
import CompletionModal from "../../modals/CompletionModal";
import ConfirmModal from "../../modals/ConfirmModal";
import ExtraIncomeModal from "../../modals/ExtraIncomeModal";
import GiftModal from "../../modals/GiftModal";
import NamePiggybanksModal from "../../modals/NamePiggybanksModal";
import PinChangeModal from "../../modals/PinChangeModal";
import SpesaModal from "../../modals/SpesaModal";
import WishEditModal from "../../modals/WishEditModal";
import { resizeImage } from "../../utils/imageResize";
import Shell from "../Shell";
import { useInterest } from "../../hooks/useInterest";
import ActivitiesTab from "./ActivitiesTab";
import HomeTab from "./HomeTab";
import MissionsTab from "./MissionsTab";
import ProfileTab from "./ProfileTab";

// Wallet e Investi sono le uniche schede con i grafici: recharts (~450KB) resta
// fuori dal bundle iniziale e arriva solo quando si apre una delle due.
const WalletTab = lazy(() => import("./WalletTab"));
const InvestTab = lazy(() => import("./InvestTab"));

const TABS: { id: ChildTab; icon: string; label: string }[] = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "act", icon: "📋", label: "Attività" },
  { id: "miss", icon: "🎯", label: "Missioni" },
  { id: "wallet", icon: "💰", label: "Wallet" },
  { id: "invest", icon: "📈", label: "Investi" },
  { id: "profile", icon: "⚙️", label: "Profilo" },
];

export default function ChildShell({
  au,
  usersApi,
  actsApi,
  matchesApi,
  onChangePin,
  onLogout,
}: {
  au: UserId;
  usersApi: UsersApi;
  actsApi: ActivitiesApi;
  matchesApi: MatchesApi;
  onChangePin: (next: string, current: string) => Promise<boolean>;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<ChildTab>("home");
  const [period, setPeriod] = useState<Period>("7g");
  const [comp, setComp] = useState<CompletionDraft | null>(null);
  const [avatar, setAvatar] = useState(false);
  const [spesa, setSpesa] = useState<SpesaDraft | null>(null);
  const [pinModal, setPinModal] = useState(false);
  const [income, setIncome] = useState(false);
  const [wish, setWish] = useState<WishDraft | null>(null);
  const [withdraw, setWithdraw] = useState<{ l: LogEntry; name: string } | null>(null);
  const [gift, setGift] = useState(false);

  const u = usersApi.users[au];
  // colori e nome mostrati alla figlia: quelli che ha scelto lei, se li ha scelti
  const uc = userColor(u);
  const grad = userGrad(u);
  const tp = usersApi.todayPts(au);
  const wp = usersApi.weekPts(au);
  const lvl = getLvl(u.totalPts);
  const todayDone = (actId: number) => usersApi.todayDone(au, actId);
  const periodDone = (a: Activity) => usersApi.periodDone(au, a);
  const unconfirmed = usersApi.unconfirmedAllowances(au);
  const interest = useInterest(au, u.w.risparmio);
  // senza la colonna sul database i nomi non sono salvabili: non li chiediamo
  const needsNames = usersApi.piggyNamesSupported && !hasFundNames(u);

  /** Card "In attesa di approvazione": stessa in Home e in Attività. */
  const pendingProps = {
    log: u.log,
    acts: actsApi.acts,
    onEditNote: (logId: number, note: string) => usersApi.editLogNote(au, logId, note),
    onWithdraw: (l: LogEntry, name: string) => setWithdraw({ l, name }),
  };

  /** Apre il modale di completamento con quante volte resta ancora disponibile. */
  const openCompletion = (a: Activity, remaining: number) =>
    setComp({
      actId: a.id,
      actName: a.name,
      cnt: 1,
      maxCnt: Math.max(1, remaining),
      freq: FREQ_UNIT[a.freq],
      note: "",
      tod: nowTod(),
      date: todayISO(),
      duration: a.duration,
    });

  /** Ogni conferma crea una voce nuova nel log: la stessa attività può essere rifatta più tardi. */
  const confirmComp = () => {
    if (!comp) return;
    const a = actsApi.findAct(comp.actId);
    if (!a) return;
    usersApi.addLog(au, a.id, comp.cnt, comp.note, comp.tod, a.pts * comp.cnt, comp.date);
    setComp(null);
  };

  const saveWish = (w: Omit<Wish, "id" | "done">) => {
    if (!wish) return;
    if (wish.mode === "add") usersApi.addWish(au, w);
    else if (wish.id) usersApi.updateWish(au, wish.id, w);
    setWish(null);
  };

  const confirmSpesa = () => {
    if (!spesa) return;
    const amount = parseFloat(spesa.a);
    if (!spesa.ds.trim() || !(amount > 0)) return;
    usersApi.addSpesa(au, spesa.ds.trim(), amount, spesa.f);
    setSpesa(null);
  };

  const content = () => {
    switch (tab) {
      case "home":
        return (
          <HomeTab
            pending={pendingProps}
            u={u}
            au={au}
            users={usersApi.users}
            uc={uc}
            grad={grad}
            tp={tp}
            wp={wp}
            acts={actsApi.visibleActs}
            todayDone={todayDone}
            weekPtsOf={usersApi.weekPts}
            paid={usersApi.paymentFor(au)}
            toConfirm={unconfirmed[0]}
            onConfirmIncome={(id) => usersApi.confirmIncome(au, id)}
            onMark={(a) => openCompletion(a, a.max - periodDone(a))}
            onNote={(fund, note) => usersApi.setPiggyNote(au, fund, note)}
            onIncome={() => setIncome(true)}
            interestThisMonth={interest.thisMonth?.amount ?? 0}
            onSpesa={() => setSpesa({ ds: "", a: "", f: "personale" })}
          />
        );
      case "act":
        return (
          <ActivitiesTab
            pending={pendingProps}
            acts={actsApi.visibleActs}
            penalties={penaltiesOf(u.log)}
            grad={grad}
            tp={tp}
            todayDone={todayDone}
            periodDone={periodDone}
            todayByTod={(actId) => usersApi.todayByTod(au, actId)}
            onMark={openCompletion}
          />
        );
      case "miss":
        return <MissionsTab u={u} au={au} users={usersApi.users} acts={actsApi.acts} matches={matchesApi.matches} grad={grad} weekPts={usersApi.weekPts} />;
      case "wallet":
        return (
          <WalletTab
            u={u}
            uc={uc}
            period={period}
            setPeriod={setPeriod}
            series={usersApi.periodSeries(au, period)}
            onNewSpesa={() => setSpesa({ ds: "", a: "", f: "personale" })}
            onNewIncome={() => setIncome(true)}
            onNewGift={() => setGift(true)}
            onConfirmIncome={(id) => usersApi.confirmIncome(au, id)}
          />
        );
      case "invest":
        return <InvestTab uid={au} u={u} uc={uc} interestSupported={usersApi.interestSupported} onChange={(k, v) => usersApi.setInvest(au, k, v)} />;
      case "profile":
        return (
          <ProfileTab
            u={u}
            uc={uc}
            tp={tp}
            wp={wp}
            onAvatar={() => setAvatar(true)}
            onPin={() => setPinModal(true)}
            onPhoto={async (file) => usersApi.setPhoto(au, await resizeImage(file))}
            onRemovePhoto={() => usersApi.setPhoto(au, undefined)}
            onTheme={(c) => usersApi.setTheme(au, c)}
            onBg={(v) => usersApi.setBgPattern(au, v)}
            onNickname={(n) => usersApi.setNickname(au, n)}
            piggyNames={usersApi.piggyNamesSupported}
            onPiggyName={(f, name) => usersApi.setPiggyName(au, f, name)}
            onAddWish={() => setWish({ mode: "add", name: "", cost: "", fund: "personale", priority: 2 })}
            onEditWish={(w) => setWish({ mode: "edit", id: w.id, name: w.name, cost: String(w.cost), fund: w.fund, priority: w.priority })}
            onDelWish={(w) => {
              if (confirm(`Togliere "${w.name}" dalla lista?`)) usersApi.delWish(au, w.id);
            }}
            onBuyWish={(w) => {
              if (confirm(`Comprato "${w.name}"? Verranno tolti €${w.cost.toFixed(2)} da ${w.fund}.`)) usersApi.buyWish(au, w.id);
            }}
          />
        );
    }
  };

  return (
    <>
      <Shell
        avatar={<Avatar photo={u.profilePhoto} emoji={u.av} size={30} radius={10} grad={u.profilePhoto ? undefined : "transparent"} />}
        title={userName(u)}
        subtitle={`${lvl.i} ${lvl.n}`}
        tint={uc}
        bgPattern={u.bgPattern}
        bgSize={bgSizeFor(u.bgPattern)}
        onLogout={onLogout}
        onAvatarClick={() => setTab("profile")}
        nav={TABS.map((t) => (
          <NavItem
            key={t.id}
            icon={t.icon}
            label={t.label}
            active={tab === t.id}
            onClick={() => setTab(t.id)}
            color={uc}
            // paghette da confermare: il pallino le porta a guardare il Wallet
            badge={t.id === "wallet" ? unconfirmed.length : 0}
          />
        ))}
      >
        <Suspense fallback={<p style={{ color: P.tx3, fontSize: 12, textAlign: "center", padding: 24 }}>Carico i grafici…</p>}>{content()}</Suspense>
      </Shell>

      {comp && (
        <CompletionModal
          draft={comp}
          setDraft={(fn) => setComp((d) => (d ? fn(d) : d))}
          color={uc}
          grad={grad}
          onConfirm={confirmComp}
          onClose={() => setComp(null)}
        />
      )}
      {needsNames && (
        <NamePiggybanksModal
          u={u}
          grad={grad}
          onSave={(names) => {
            (Object.keys(names) as Fund[]).forEach((f) => void usersApi.setPiggyName(au, f, names[f]));
          }}
        />
      )}
      {gift && (
        <GiftModal
          who={userName(u)}
          grad={grad}
          personaleName={fundName(u, "personale")}
          onSave={(from, reason, amount) => {
            void usersApi.addGift(au, from, reason, amount);
            setGift(false);
          }}
          onClose={() => setGift(false)}
        />
      )}
      {withdraw && (
        <ConfirmModal
          title="Ritirare l'invio?"
          message={
            <>
              "{withdraw.name}" del {withdraw.l.date} sparisce e l'admin non la vedrà. Potrai sempre segnarla di nuovo.
            </>
          }
          confirmLabel="Ritira"
          danger
          onConfirm={() => usersApi.withdrawLog(au, withdraw.l.id)}
          onClose={() => setWithdraw(null)}
        />
      )}
      {avatar && (
        <AvatarPicker
          current={u.av}
          color={uc}
          onPick={(av) => {
            usersApi.setAvatar(au, av);
            setAvatar(false);
          }}
          onClose={() => setAvatar(false)}
        />
      )}
      {spesa && (
        <SpesaModal draft={spesa} setDraft={(fn) => setSpesa((d) => (d ? fn(d) : d))} balance={u.w[spesa.f]} onSave={confirmSpesa} onClose={() => setSpesa(null)} />
      )}
      {income && (
        <ExtraIncomeModal
          who={userName(u)}
          grad={grad}
          onSave={(entry) => {
            usersApi.addIncome(au, entry);
            setIncome(false);
          }}
          onClose={() => setIncome(false)}
        />
      )}
      {wish && <WishEditModal init={wish} color={uc} onSave={saveWish} onClose={() => setWish(null)} />}
      {pinModal && (
        <PinChangeModal
          onSave={async (next, current) => {
            const ok = await onChangePin(next, current);
            if (ok) setPinModal(false);
            return ok;
          }}
          onClose={() => setPinModal(false)}
        />
      )}
    </>
  );
}

import { Suspense, lazy, useState } from "react";
import { FREQ_UNIT, getLvl } from "../../data/constants";
import type { ChildTab, CompletionDraft, Period, SpesaDraft, UserId, Wish, WishDraft } from "../../data/types";
import { Avatar, NavItem } from "../../design/components";
import { bgSizeFor, userColor, userGrad, userName } from "../../design/theme";
import { P } from "../../design/tokens";
import type { MatchesApi } from "../../hooks/useMatches";
import type { ActivitiesApi, UsersApi } from "../../hooks/useSupabase";
import AvatarPicker from "../../modals/AvatarPicker";
import CompletionModal from "../../modals/CompletionModal";
import ExtraIncomeModal from "../../modals/ExtraIncomeModal";
import PinChangeModal from "../../modals/PinChangeModal";
import SpesaModal from "../../modals/SpesaModal";
import WishEditModal from "../../modals/WishEditModal";
import { resizeImage } from "../../utils/imageResize";
import Shell from "../Shell";
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
  pin,
  onChangePin,
  onLogout,
}: {
  au: UserId;
  usersApi: UsersApi;
  actsApi: ActivitiesApi;
  matchesApi: MatchesApi;
  pin: string;
  onChangePin: (next: string) => void;
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

  const u = usersApi.users[au];
  // colori e nome mostrati alla figlia: quelli che ha scelto lei, se li ha scelti
  const uc = userColor(u);
  const grad = userGrad(u);
  const tp = usersApi.todayPts(au);
  const wp = usersApi.weekPts(au);
  const lvl = getLvl(u.totalPts);
  const todayDone = (actId: number) => usersApi.todayDone(au, actId);

  /** Ogni conferma crea una voce nuova nel log: la stessa attività può essere rifatta più tardi. */
  const confirmComp = () => {
    if (!comp) return;
    const a = actsApi.findAct(comp.actId);
    if (!a) return;
    usersApi.addLog(au, a.id, comp.cnt, comp.note, comp.tod, a.pts * comp.cnt);
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
            u={u}
            au={au}
            users={usersApi.users}
            uc={uc}
            grad={grad}
            tp={tp}
            wp={wp}
            acts={actsApi.acts}
            todayDone={todayDone}
            weekPtsOf={usersApi.weekPts}
            paid={usersApi.paymentFor(au)}
            onNote={(fund, note) => usersApi.setPiggyNote(au, fund, note)}
            onIncome={() => setIncome(true)}
            onSpesa={() => setSpesa({ ds: "", a: "", f: "personale" })}
          />
        );
      case "act":
        return (
          <ActivitiesTab
            acts={actsApi.acts}
            grad={grad}
            tp={tp}
            todayDone={todayDone}
            todayByTod={(actId) => usersApi.todayByTod(au, actId)}
            onMark={(a, remaining) =>
              setComp({ actId: a.id, actName: a.name, cnt: 1, maxCnt: remaining, freq: FREQ_UNIT[a.freq], note: "", tod: "mattina", duration: a.duration })
            }
          />
        );
      case "miss":
        return <MissionsTab u={u} users={usersApi.users} acts={actsApi.acts} matches={matchesApi.matches} weekPts={usersApi.weekPts} />;
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
          />
        );
      case "invest":
        return <InvestTab u={u} onChange={(k, v) => usersApi.setInvest(au, k, v)} />;
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
          <NavItem key={t.id} icon={t.icon} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} color={uc} />
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
          currentPin={pin}
          onSave={(next) => {
            onChangePin(next);
            setPinModal(false);
          }}
          onClose={() => setPinModal(false)}
        />
      )}
    </>
  );
}

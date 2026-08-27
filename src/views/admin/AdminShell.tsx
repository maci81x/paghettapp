import { useState } from "react";
import { USER_IDS, todayISO } from "../../data/constants";
import type { ActivityDraft, AdminTab, LogEntry, MatchDraft, MissionDraft, Period, PinKey, UserId } from "../../data/types";
import { Avatar, NavItem, Pill } from "../../design/components";
import { P } from "../../design/tokens";
import type { MatchesApi } from "../../hooks/useMatches";
import type { ActivitiesApi, UsersApi } from "../../hooks/useSupabase";
import { fmtDay } from "../../utils/dates";
import ActivityEditModal from "../../modals/ActivityEditModal";
import ActivityPenaltyModal from "../../modals/ActivityPenaltyModal";
import BonusPointsModal from "../../modals/BonusPointsModal";
import ConfirmModal from "../../modals/ConfirmModal";
import DeductPointsModal from "../../modals/DeductPointsModal";
import ExtraIncomeModal from "../../modals/ExtraIncomeModal";
import MatchEditModal from "../../modals/MatchEditModal";
import MissionEditModal from "../../modals/MissionEditModal";
import PiggyActionModal from "../../modals/PiggyActionModal";
import type { PiggyActionDraft } from "../../modals/PiggyActionModal";
import PinChangeModal from "../../modals/PinChangeModal";
import Shell from "../Shell";
import AdminActivitiesTab from "./AdminActivitiesTab";
import AdminChildView from "./AdminChildView";
import AdminChildrenSummary from "./AdminChildrenSummary";
import AdminComparisonCard from "./AdminComparisonCard";
import AdminMatchTab from "./AdminMatchTab";
import AdminMissionsTab from "./AdminMissionsTab";
import AdminPiggyTab from "./AdminPiggyTab";
import AdminPinsTab from "./AdminPinsTab";
import ApproveTab from "./ApproveTab";

const TABS: { id: AdminTab; i: string; l: string }[] = [
  { id: "approve", i: "✅", l: "Approva" },
  { id: "acts", i: "📋", l: "Attività" },
  { id: "miss", i: "🎯", l: "Missioni" },
  { id: "match", i: "⚔️", l: "Match" },
  { id: "piggy", i: "🏦", l: "Salvadanai" },
  { id: "pins", i: "🔑", l: "PIN" },
];

export default function AdminShell({
  usersApi,
  actsApi,
  matchesApi,
  adminPin,
  onSetPin,
  onResetPin,
  onLogout,
}: {
  usersApi: UsersApi;
  actsApi: ActivitiesApi;
  matchesApi: MatchesApi;
  /** PIN digitato al login: le funzioni SQL lo richiedono per cambiare i PIN. */
  adminPin: string;
  onSetPin: (target: PinKey, next: string, adminPin: string) => Promise<boolean>;
  onResetPin: (target: PinKey, adminPin: string) => Promise<boolean>;
  onLogout: () => void;
}) {
  const [tab, setTab] = useState<AdminTab>("approve");
  const [view, setView] = useState<UserId | null>(null);
  const [piggyAction, setPiggyAction] = useState<{ uid: UserId; draft: PiggyActionDraft } | null>(null);
  const [period, setPeriod] = useState<Period>("7g");
  const [actDraft, setActDraft] = useState<ActivityDraft | null>(null);
  const [matchDraft, setMatchDraft] = useState<MatchDraft | null>(null);
  const [missDraft, setMissDraft] = useState<MissionDraft | null>(null);
  const [pinTarget, setPinTarget] = useState<PinKey | null>(null);
  const [incomeFor, setIncomeFor] = useState<UserId | null>(null);
  const [bonusFor, setBonusFor] = useState<UserId | null>(null);
  const [deductFor, setDeductFor] = useState<UserId | null>(null);
  const [penaltyFor, setPenaltyFor] = useState<UserId | null>(null);
  const [logAction, setLogAction] = useState<{ uid: UserId; log: LogEntry; name: string; mode: "revoke" | "delete" } | null>(null);

  const { users } = usersApi;

  const saveAct = () => {
    if (!actDraft?.name.trim()) return;
    if (actDraft.mode === "add") actsApi.addAct(actDraft);
    else actsApi.updateAct(actDraft);
    setActDraft(null);
  };

  const saveMatch = () => {
    if (!matchDraft?.name.trim()) return;
    if (matchDraft.mode === "add") matchesApi.addMatch(matchDraft);
    else matchesApi.updateMatch(matchDraft);
    setMatchDraft(null);
  };

  const saveMission = () => {
    if (!missDraft?.name.trim()) return;
    const targets: UserId[] = missDraft.to === "both" ? [...USER_IDS] : [missDraft.to];
    usersApi.upsertMission(missDraft.id, targets, {
      name: missDraft.name.trim(),
      emoji: missDraft.emoji || "🎯",
      desc: missDraft.desc.trim(),
      prog: 0,
      tgt: missDraft.tgt,
      pts: missDraft.pts,
      team: missDraft.team,
      deadline: missDraft.deadline,
      assignee: missDraft.to,
      actIds: missDraft.actIds,
      // riscrivere `since` in modifica sposterebbe la data di partenza e
      // cancellerebbe tutto il progresso già maturato
      since: missDraft.since || todayISO(),
    });
    setMissDraft(null);
  };

  const body = () => {
    if (view) {
      return (
        <AdminChildView
          uid={view}
          users={users}
          acts={actsApi.acts}
          todayPts={usersApi.todayPts(view)}
          weekPts={usersApi.weekPts(view)}
          period={period}
          setPeriod={setPeriod}
          due={usersApi.duePreview(view)}
          paid={usersApi.paymentFor(view)}
          onPay={() => usersApi.payWeek(view)}
          onUndoPay={(week) => {
            if (confirm("Annullare l'accredito di questa settimana?")) usersApi.undoPayment(view, week);
          }}
          onApprove={usersApi.approve}
          onReject={usersApi.reject}
          onRevoke={(log, name) => setLogAction({ uid: view, log, name, mode: "revoke" })}
          onDeleteLog={(log, name) => setLogAction({ uid: view, log, name, mode: "delete" })}
          onDeduct={() => setDeductFor(view)}
          onPenalty={() => setPenaltyFor(view)}
          onIncome={() => setIncomeFor(view)}
          onBonus={() => setBonusFor(view)}
          namesRequired={usersApi.piggyNamesSupported}
          onPiggyAction={(mode, fund) => setPiggyAction({ uid: view, draft: { mode, fund } })}
        />
      );
    }
    const tabBody = () => {
      switch (tab) {
        case "approve":
          return (
            <ApproveTab
              users={users}
              acts={actsApi.acts}
              onApprove={usersApi.approve}
              onReject={usersApi.reject}
              onApproveMany={usersApi.approveMany}
              onRejectMany={(picks) => {
                // rejectLog cancella le righe: senza conferma non si torna indietro
                if (!confirm(`Rifiutare ${picks.length} attività? Le voci verranno cancellate, non è reversibile.`)) return false;
                void usersApi.rejectMany(picks);
                return true;
              }}
            />
          );
        case "acts":
          return (
            <AdminActivitiesTab
              acts={actsApi.acts}
              canHide={actsApi.canHideActs}
              onToggleHidden={(a) => actsApi.toggleActHidden(a.id, !a.hidden)}
              onToggleHiddenMany={(ids, hidden) => void actsApi.toggleActHiddenMany(ids, hidden)}
              onNew={() => setActDraft({ mode: "add", name: "", emoji: "", cat: "casa", pts: 3, pen: 0, freq: "daily", max: 1, ch: 0, duration: "" })}
              onEdit={(a) =>
                setActDraft({
                  mode: "edit",
                  id: a.id,
                  name: a.name,
                  emoji: a.emoji ?? "",
                  cat: a.cat,
                  pts: a.pts,
                  pen: a.pen,
                  freq: a.freq,
                  max: a.max,
                  ch: a.ch,
                  duration: a.duration ? String(a.duration) : "",
                })
              }
              onDelete={(a) => {
                if (confirm(`Eliminare "${a.name}"?`)) actsApi.delAct(a.id);
              }}
              onDeleteMany={(ids) => {
                if (!confirm(`Eliminare ${ids.length} attività? Non è reversibile.`)) return false;
                void actsApi.delActs(ids);
                return true;
              }}
            />
          );
        case "miss":
          return (
            <AdminMissionsTab
              canHide={usersApi.canHideMiss}
              onToggleHidden={(m) => usersApi.toggleMissHidden(m.id, !m.hidden)}
              onToggleHiddenMany={(ids, hidden) => void usersApi.toggleMissHiddenMany(ids, hidden)}
              onDeleteMany={(ids) => {
                if (!confirm(`Eliminare ${ids.length} missioni? Non è reversibile.`)) return false;
                void usersApi.delMissions(ids);
                return true;
              }}
              users={users}
              acts={actsApi.acts}
              awardsSupported={usersApi.missionAwardsSupported}
              onBump={usersApi.bumpMission}
              onNew={() => setMissDraft({ mode: "add", name: "", emoji: "🎯", desc: "", tgt: 5, pts: 30, team: false, deadline: "", to: "mia", actIds: [] })}
              onEdit={(m) =>
                setMissDraft({
                  mode: "edit",
                  id: m.id,
                  name: m.name,
                  emoji: m.emoji || "🎯",
                  desc: m.desc ?? "",
                  since: m.since,
                  tgt: m.tgt,
                  pts: m.pts,
                  team: m.team,
                  deadline: m.deadline ?? "",
                  to: m.assignee ?? "mia",
                  actIds: m.actIds ?? [],
                })
              }
              onDelete={usersApi.delMission}
            />
          );
        case "match":
          return (
            <AdminMatchTab
              matches={matchesApi.matches}
              onNew={() => setMatchDraft({ mode: "add", name: "", desc: "", prize: "", act: actsApi.acts[0]?.name || "", durDays: 7 })}
              onEdit={(m) => setMatchDraft({ mode: "edit", id: m.id, name: m.name, desc: m.desc, prize: m.prize, act: m.act, durDays: m.durDays })}
              onDelete={(m) => {
                if (confirm(`Eliminare il match "${m.name}"?`)) matchesApi.delMatch(m.id);
              }}
              onToggle={matchesApi.toggleVis}
            />
          );
        case "piggy":
          return (
            <AdminPiggyTab
              users={users}
              period={period}
              setPeriod={setPeriod}
              duePreview={usersApi.duePreview}
              paymentFor={(uid) => usersApi.paymentFor(uid)}
              onPay={usersApi.payWeek}
              onUndo={(uid, week) => {
                if (confirm("Annullare l'accredito di questa settimana?")) usersApi.undoPayment(uid, week);
              }}
              onIncome={setIncomeFor}
            />
          );
        case "pins":
          return (
            <AdminPinsTab
              onChange={(k) => setPinTarget(k)}
              onReset={async (k) => {
                if (!confirm("Riportare il PIN a quello di fabbrica?")) return;
                const ok = await onResetPin(k, adminPin);
                if (!ok) alert("Reset non riuscito: il database ha rifiutato la richiesta.");
              }}
            />
          );
      }
    };
    return (
      <div>
        <AdminChildrenSummary users={users} weekPts={usersApi.weekPts} onOpen={setView} />
        <AdminComparisonCard users={users} />
        <div style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          {TABS.map((t) => (
            <Pill key={t.id} active={tab === t.id} onClick={() => setTab(t.id)} color={P.acc}>
              {t.i} {t.l}
            </Pill>
          ))}
        </div>
        {tabBody()}
      </div>
    );
  };

  return (
    <>
      <Shell
        avatar={view ? <Avatar photo={users[view].profilePhoto} emoji={users[view].av} size={30} radius={10} grad="transparent" /> : "🔒"}
        title={view ? `Admin › ${users[view].n}` : "Admin"}
        subtitle={view ? undefined : `${usersApi.allPending} in attesa`}
        tint={view ? users[view].c : P.acc}
        onBack={view ? () => setView(null) : undefined}
        onLogout={onLogout}
        nav={
          <>
            <NavItem icon="🔒" label="Admin" active={!view} onClick={() => setView(null)} color={P.acc} badge={usersApi.allPending} />
            <NavItem icon={users.mia.av} label={users.mia.n} active={view === "mia"} onClick={() => setView("mia")} color={P.mia} badge={usersApi.pendingCnt("mia")} />
            <NavItem icon={users.samira.av} label={users.samira.n} active={view === "samira"} onClick={() => setView("samira")} color={P.sam} badge={usersApi.pendingCnt("samira")} />
          </>
        }
      >
        {body()}
      </Shell>

      {actDraft && <ActivityEditModal draft={actDraft} setDraft={(fn) => setActDraft((d) => (d ? fn(d) : d))} onSave={saveAct} onClose={() => setActDraft(null)} />}
      {matchDraft && (
        <MatchEditModal draft={matchDraft} setDraft={(fn) => setMatchDraft((d) => (d ? fn(d) : d))} acts={actsApi.acts} onSave={saveMatch} onClose={() => setMatchDraft(null)} />
      )}
      {bonusFor && (
        <BonusPointsModal
          who={users[bonusFor].n}
          grad={users[bonusFor].grad}
          onSave={(pts, reason) => {
            usersApi.addBonus(bonusFor, pts, reason);
            setBonusFor(null);
          }}
          onClose={() => setBonusFor(null)}
        />
      )}
      {penaltyFor && (
        <ActivityPenaltyModal
          who={users[penaltyFor].n}
          acts={actsApi.acts}
          onSave={(act, note) => {
            usersApi.penalizeActivity(penaltyFor, act.id, act.pen, note);
            setPenaltyFor(null);
          }}
          onClose={() => setPenaltyFor(null)}
        />
      )}
      {deductFor && (
        <DeductPointsModal
          who={users[deductFor].n}
          onSave={(pts, reason) => {
            usersApi.deductPoints(deductFor, pts, reason);
            setDeductFor(null);
          }}
          onClose={() => setDeductFor(null)}
        />
      )}
      {logAction && (
        <ConfirmModal
          title={logAction.mode === "revoke" ? "↩️ Annullare l'approvazione?" : "🗑️ Eliminare il record?"}
          message={
            logAction.mode === "revoke" ? (
              <>
                Annullare <b>{logAction.name}</b> del {fmtDay(logAction.log.date)}? Verranno tolti{" "}
                <b style={{ color: P.red }}>{Math.abs(logAction.log.pts)} punti</b> a {users[logAction.uid].n}.
              </>
            ) : (
              <>
                Eliminare questo record ({logAction.name} del {fmtDay(logAction.log.date)})? I punti verranno ricalcolati.
              </>
            )
          }
          confirmLabel={logAction.mode === "revoke" ? "↩️ Annulla i punti" : "🗑️ Elimina"}
          danger={logAction.mode === "delete"}
          onConfirm={() => {
            if (logAction.mode === "revoke") usersApi.revoke(logAction.uid, logAction.log.id);
            else usersApi.delLog(logAction.uid, logAction.log.id);
          }}
          onClose={() => setLogAction(null)}
        />
      )}
      {incomeFor && (
        <ExtraIncomeModal
          who={users[incomeFor].n}
          grad={users[incomeFor].grad}
          onSave={(entry) => {
            usersApi.addIncome(incomeFor, entry);
            setIncomeFor(null);
          }}
          onClose={() => setIncomeFor(null)}
        />
      )}
      {piggyAction && (
        <PiggyActionModal
          draft={piggyAction.draft}
          u={users[piggyAction.uid]}
          onRedeem={(fund, amount, reason) => usersApi.redeemPiggy(piggyAction.uid, fund, amount, reason)}
          onReset={(fund) => usersApi.resetPiggy(piggyAction.uid, fund)}
          onClose={() => setPiggyAction(null)}
        />
      )}
      {missDraft && (
        <MissionEditModal
          draft={missDraft}
          setDraft={(fn) => setMissDraft((d) => (d ? fn(d) : d))}
          acts={actsApi.acts}
          names={{ mia: users.mia.n, samira: users.samira.n }}
          onSave={saveMission}
          onClose={() => setMissDraft(null)}
        />
      )}
      {pinTarget && (
        <PinChangeModal
          requireCurrent={false}
          title={`🔑 Nuovo PIN · ${pinTarget}`}
          onSave={async (next) => {
            const ok = await onSetPin(pinTarget, next, adminPin);
            if (ok) setPinTarget(null);
            return ok;
          }}
          onClose={() => setPinTarget(null)}
        />
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import { BADGES } from "./data/constants";
import GlobalStyle from "./design/GlobalStyle";
import { P, gls } from "./design/tokens";
import { useActivities } from "./hooks/useActivities";
import { useAuth } from "./hooks/useAuth";
import { useMatches } from "./hooks/useMatches";
import { useUsers } from "./hooks/useUsers";
import Login from "./views/Login";
import PinEntry from "./views/PinEntry";
import AdminShell from "./views/admin/AdminShell";
import ChildShell from "./views/child/ChildShell";

export default function App() {
  const auth = useAuth();
  const usersApi = useUsers();
  const actsApi = useActivities();
  const matchesApi = useMatches();
  const [toast, setToast] = useState<{ who: string; badge: string } | null>(null);

  /**
   * I badge si valutano sullo stato: qualsiasi azione rilevante (approvazione,
   * paghetta, spesa, acquisto di un desiderio) fa ripassare di qui.
   */
  const { users, syncBadges } = usersApi;
  const { acts } = actsApi;
  useEffect(() => {
    const fresh = syncBadges(acts.map((a) => a.id));
    if (fresh.length > 0) {
      const last = fresh[fresh.length - 1];
      setToast({ who: users[last.uid].n, badge: last.id });
    }
    // syncBadges legge `users`: basta rivalutare quando cambiano utenti o attività
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, acts]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const view = () => {
    if (auth.scr === "pin" && auth.target) {
      return (
        <PinEntry
          target={auth.target}
          users={usersApi.users}
          pin={auth.pin}
          err={auth.err}
          onPress={auth.press}
          onDelete={auth.del}
          onBack={auth.toLogin}
        />
      );
    }
    if (auth.scr === "admin") {
      return (
        <AdminShell
          usersApi={usersApi}
          actsApi={actsApi}
          matchesApi={matchesApi}
          pins={auth.pins}
          onChangePin={auth.changePin}
          onResetPin={auth.resetPin}
          onLogout={auth.logout}
        />
      );
    }
    if (auth.scr === "app" && auth.au) {
      return (
        <ChildShell
          au={auth.au}
          usersApi={usersApi}
          actsApi={actsApi}
          matchesApi={matchesApi}
          pin={auth.pins[auth.au]}
          onChangePin={(next) => auth.au && auth.changePin(auth.au, next)}
          onLogout={auth.logout}
        />
      );
    }
    return <Login users={usersApi.users} onPick={auth.startLogin} />;
  };

  const badge = toast && BADGES.find((b) => b.id === toast.badge);

  return (
    <>
      <GlobalStyle />
      {view()}
      {toast && badge && (
        <div
          className="anim"
          onClick={() => setToast(null)}
          style={{
            position: "fixed",
            top: 14,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            ...gls,
            background: "rgba(15,15,30,.96)",
            border: `1px solid ${P.gold}55`,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
            maxWidth: 340,
          }}
        >
          <span style={{ fontSize: 26 }}>{badge.i}</span>
          <div>
            <p style={{ color: P.gold, fontSize: 11, fontWeight: 800, margin: 0 }}>🏅 Badge sbloccato!</p>
            <p style={{ color: P.tx, fontSize: 12, fontWeight: 700, margin: 0 }}>{badge.n}</p>
            <p style={{ color: P.tx3, fontSize: 9, margin: 0 }}>{toast.who}</p>
          </div>
        </div>
      )}
    </>
  );
}

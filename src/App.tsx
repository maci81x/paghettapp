import { useEffect, useState } from "react";
import { BADGES } from "./data/constants";
import GlobalStyle from "./design/GlobalStyle";
import { P, gls, screen } from "./design/tokens";
import { useAuth } from "./hooks/useAuth";
import { useMatches } from "./hooks/useMatches";
import { useSupabase } from "./hooks/useSupabase";
import Login from "./views/Login";
import PinEntry from "./views/PinEntry";
import AdminShell from "./views/admin/AdminShell";
import ChildShell from "./views/child/ChildShell";

export default function App() {
  const db = useSupabase();
  const auth = useAuth(db.verifyPin);
  const matchesApi = useMatches();
  const [toast, setToast] = useState<{ who: string; badge: string } | null>(null);

  /**
   * I badge si valutano sullo stato: qualsiasi azione rilevante (approvazione,
   * paghetta, spesa, acquisto di un desiderio) fa ripassare di qui.
   */
  const { users, acts, syncBadges } = db;
  useEffect(() => {
    if (db.loading) return;
    const fresh = syncBadges(acts.map((a) => a.id));
    if (fresh.length > 0) {
      const last = fresh[fresh.length - 1];
      setToast({ who: users[last.uid].n, badge: last.id });
    }
    // syncBadges legge `users`: basta rivalutare quando cambiano utenti o attività
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, acts, db.loading]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const view = () => {
    if (db.loading) {
      return (
        <div style={{ ...screen, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: P.tx3, fontSize: 13 }}>Carico i dati…</p>
        </div>
      );
    }
    if (auth.scr === "pin" && auth.target) {
      return (
        <PinEntry
          target={auth.target}
          users={db.users}
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
          usersApi={db}
          actsApi={db}
          matchesApi={matchesApi}
          adminPin={auth.sessionPin}
          onSetPin={db.adminSetPin}
          onResetPin={db.resetPin}
          onLogout={auth.logout}
        />
      );
    }
    if (auth.scr === "app" && auth.au) {
      return (
        <ChildShell
          au={auth.au}
          usersApi={db}
          actsApi={db}
          matchesApi={matchesApi}
          onChangePin={(next, current) => db.changePin(auth.au!, next, current)}
          onLogout={auth.logout}
        />
      );
    }
    return <Login users={db.users} onPick={auth.startLogin} />;
  };

  const badge = toast && BADGES.find((b) => b.id === toast.badge);

  return (
    <>
      <GlobalStyle />
      {view()}

      {db.offline && !db.loading && (
        <div
          style={{
            position: "fixed",
            bottom: 74,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9998,
            ...gls,
            background: "rgba(15,15,30,.96)",
            border: `1px solid ${P.gold}44`,
            color: P.gold,
            fontSize: 10,
            fontWeight: 700,
            padding: "5px 12px",
          }}
        >
          📴 Offline · le modifiche partiranno appena torna la rete
        </div>
      )}

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

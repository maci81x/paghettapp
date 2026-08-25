import type { PinKey, Users } from "../data/types";
import { Avatar } from "../design/components";
import { userColor, userGrad, userName } from "../design/theme";
import { P, alpha, gls, screen } from "../design/tokens";

export default function Login({ users, onPick }: { users: Users; onPick: (k: PinKey) => void }) {
  const profiles: { k: PinKey; l: string; c: string; av: string; grad: string; photo?: string }[] = [
    { k: "mia", l: userName(users.mia), c: userColor(users.mia), av: users.mia.av, grad: userGrad(users.mia), photo: users.mia.profilePhoto },
    { k: "samira", l: userName(users.samira), c: userColor(users.samira), av: users.samira.av, grad: userGrad(users.samira), photo: users.samira.profilePhoto },
    { k: "admin", l: "Admin", c: P.acc, av: "🔒", grad: P.accG },
  ];
  return (
    <div style={{ ...screen, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: P.accG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          marginBottom: 14,
          boxShadow: `0 8px 32px ${alpha(P.acc, 27)}`,
        }}
      >
        💰
      </div>
      <h1
        style={{
          fontSize: 26,
          fontWeight: 800,
          margin: "0 0 2px",
          letterSpacing: -1,
          background: P.accG,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        PaghettApp
      </h1>
      <p style={{ color: P.tx3, fontSize: 12, marginBottom: 36, letterSpacing: 0.5 }}>Guadagna · Risparmia · Cresci</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
        {profiles.map((p) => (
          <button
            key={p.k}
            onClick={() => onPick(p.k)}
            style={{ display: "flex", alignItems: "center", gap: 14, ...gls, padding: "16px 20px", cursor: "pointer", width: "100%", transition: "all .2s" }}
          >
            <Avatar photo={p.photo} emoji={p.av} size={46} radius={14} grad={p.grad} style={{ boxShadow: `0 4px 14px ${p.c}33` }} />
            <span style={{ color: P.tx, fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>{p.l}</span>
            <span style={{ marginLeft: "auto", color: P.tx3, fontSize: 14 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

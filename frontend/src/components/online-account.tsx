"use client";
import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { useOnline } from "./online-provider";

export function OnlineAccount() {
  const { text, act, busy } = useOnline();
  const [mode, setMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await act({ action: mode, username, password })) setPassword("");
  }
  return (
    <section className="panel online-account">
      <span className="feature-icon">
        <KeyRound size={25} />
      </span>
      <h2>{text[mode]}</h2>
      <p>{text.accountHelp}</p>
      <div className="online-tabs">
        {(["register", "login"] as const).map((item) => (
          <button
            key={item}
            aria-pressed={mode === item}
            onClick={() => setMode(item)}
          >
            {text[item]}
          </button>
        ))}
      </div>
      <form onSubmit={submit}>
        <label>
          {text.username}
          <input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_]{3,24}"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label>
          {text.password}
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            required
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={busy} type="submit">
          {text[mode]}
        </button>
      </form>
      <small>{text.accountNote}</small>
    </section>
  );
}

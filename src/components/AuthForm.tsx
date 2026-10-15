"use client";
import { useState } from "react";
import { supabase } from "@/lib/db";
import { ROLES } from "@/lib/types";

const inputStyle = {
  background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 12px",
} as const;

export default function AuthForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState(""), [role, setRole] = useState<string>(ROLES[0]);
  const [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setError(""); setNotice(""); setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!name.trim()) throw new Error("Enter your name.");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { name: name.trim(), role }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        // With email confirmation on, there is no session until the link is clicked.
        if (!data.session) setNotice("Check your email for a confirmation link, then log in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally { setBusy(false); }
  }

  return (
    <div className="wrap">
      <main style={{ paddingTop: 48 }}>
        <div>
          <div className="eyebrow">Nerd Out, Inc.</div>
          <h1>Daily Check-ins</h1>
        </div>
        <form className="form" onSubmit={submit}>
          <h2>{mode === "signin" ? "Log in" : "Create your account"}</h2>
          {mode === "signup" && <>
            <label>Your name
              <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>
            <label>Your role
              <select style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select></label>
          </>}
          <label>Email
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
          <label>Password {mode === "signup" && <span className="hint">At least 8 characters.</span>}
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "signup" ? 8 : undefined} required
              autoComplete={mode === "signin" ? "current-password" : "new-password"} /></label>
          {error && <div className="error">{error}</div>}
          {notice && <div className="toast">{notice}</div>}
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "One moment..." : mode === "signin" ? "Log in" : "Sign up"}
          </button>
          <button type="button" className="btn small ghost"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setNotice(""); }}>
            {mode === "signin" ? "New here? Create an account" : "Have an account? Log in"}
          </button>
        </form>
      </main>
    </div>
  );
}

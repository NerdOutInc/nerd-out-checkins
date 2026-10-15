"use client";
import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { addCheckin, addSms, getProfile, getTeam, listCheckins, listSms, patchCheckin, supabase } from "@/lib/db";
import type { Checkin, Profile, SmsMessage, Tab, Team } from "@/lib/types";
import { nowTime, today } from "@/lib/dates";
import { confirmText, parseText, tidy } from "@/lib/sms";
import AuthForm from "./AuthForm";
import Feed from "./Feed";
import CheckinTab, { type SmsResult } from "./CheckinTab";
import Report from "./Report";

const TABS: [Tab, string][] = [["checkin", "Check in"], ["feed", "Feed"], ["report", "Report"]];
const PREFS_KEY = "nerdout.prefs";

function Notice({ children }: { children: React.ReactNode }) {
  return <div className="wrap"><main style={{ paddingTop: 48 }}><div className="empty">{children}</div></main></div>;
}

/** Auth gate: loads the session, then the signed-in user's profile. */
export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = still loading
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (session === undefined) return;
    if (!userId) { setProfile(null); return; }
    setProfile(undefined);
    getProfile(userId).then(setProfile).catch(() => setProfile(null));
  }, [session, userId]);

  if (!supabase) {
    return <Notice><b>Supabase isn&apos;t configured</b>Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see the README).</Notice>;
  }
  if (session === undefined || (session && profile === undefined)) return null;
  if (!session) return <AuthForm />;
  if (!profile) {
    return <Notice><b>Your profile wasn&apos;t found</b>
      Run the auth migration (supabase/migrations/0002_auth.sql), then{" "}
      <a href="#" onClick={(e) => { e.preventDefault(); void supabase!.auth.signOut(); }}>log out</a> and create your account again.</Notice>;
  }
  return <CheckIns me={profile} />;
}

function CheckIns({ me }: { me: Profile }) {
  const [team, setTeam] = useState<Team>({ owner: null, members: [] });
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [smsResult, setSmsResult] = useState<SmsResult>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [tab, setTab] = useState<Tab>("feed");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"today" | "week">("today");
  const [mode, setMode] = useState<"form" | "text">("form");
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const ownerName = team.owner?.name ?? "the owner";

  // Per-browser view preferences
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
      if (["checkin", "feed", "report"].includes(p.tab)) setTab(p.tab);
      if (p.filter) setFilter(p.filter);
      if (p.view === "week") setView("week");
      if (p.mode === "text") setMode("text");
    } catch { /* ignore */ }
    setPrefsLoaded(true);
  }, []);
  useEffect(() => {
    if (prefsLoaded) try { localStorage.setItem(PREFS_KEY, JSON.stringify({ tab, filter, view, mode })); } catch { /* ignore */ }
  }, [prefsLoaded, tab, filter, view, mode]);

  const refresh = useCallback(async () => {
    try { setCheckins(await listCheckins()); }
    catch { setToast({ text: "Couldn't load check-ins. Check your connection.", bad: true }); }
    finally { setLoading(false); }
  }, []);
  const refreshSms = useCallback(async () => {
    try { setMessages(await listSms(me.id, today())); } catch { /* keep current */ }
  }, [me.id]);

  useEffect(() => { void getTeam().then(setTeam).catch(() => {}); void refresh(); void refreshSms(); }, [refresh, refreshSms]);
  useEffect(() => {
    const onFocus = () => { void refresh(); void refreshSms(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, refreshSms]);

  async function save(fn: () => Promise<void>) {
    try { await fn(); return true; }
    catch { setToast({ text: "Couldn't save that. Check your connection and try again.", bad: true }); return false; }
  }
  const goFeed = () => { setToast(null); setFilter("all"); setTab("feed"); };

  async function submitForm(v: { done: string; plan: string; blocked: string }) {
    const ok = await save(() => addCheckin({ user_id: me.id, person: me.name, date: today(), time: nowTime(), via: "web", ...v }));
    if (!ok) return false;
    await refresh();
    goFeed();
    setToast({ text: "Check-in posted. It's at the top of today's feed." });
    return true;
  }

  async function sendSms(text: string) {
    const t = nowTime(), date = today();
    const existing = checkins.find((c) => c.user_id === me.id && c.date === date && c.via === "text");
    if (existing) {
      await save(async () => {
        await patchCheckin(existing.id, { replies: [...existing.replies, { by: me.name, date, time: t, text }] });
        await addSms(me.id, date, [{ dir: "in", time: t, text }, { dir: "out", time: t, text: "Added to today's check-in." }]);
      });
      setSmsResult({ c: existing, added: true });
    } else {
      const parsed = parseText(text);
      if (!parsed.done && !parsed.plan && !parsed.blocked) parsed.done = tidy(text);
      const c = { user_id: me.id, person: me.name, date, time: t, via: "text" as const, raw: text, ...parsed };
      await save(async () => {
        await addSms(me.id, date, [{ dir: "in", time: t, text }, { dir: "out", time: t, text: confirmText(c, ownerName) }]);
        await addCheckin(c);
      });
      setSmsResult({ c, added: false });
    }
    await Promise.all([refresh(), refreshSms()]);
  }

  async function reply(c: Checkin, text: string) {
    const r = { by: me.name, date: today(), time: nowTime(), text };
    const ok = await save(async () => {
      await patchCheckin(c.id, { replies: [...c.replies, r] });
      // A reply to a texted check-in also lands on that person's phone
      if (c.via === "text" && c.user_id && c.user_id !== me.id) {
        await addSms(c.user_id, c.date, [{ dir: "out", time: r.time, text: `${me.name}: ${text}` }]);
      }
    });
    await Promise.all([refresh(), refreshSms()]);
    return ok;
  }

  async function resolve(c: Checkin) {
    await save(() => patchCheckin(c.id, {
      resolved: true,
      replies: [...c.replies, { by: me.name, date: today(), time: nowTime(), text: "Marked this blocker resolved." }],
    }));
    await refresh();
  }

  if (!prefsLoaded) return null;
  return (
    <>
      <header>
        <div className="head-row">
          <div>
            <div className="eyebrow">Nerd Out, Inc.</div>
            <h1>Daily Check-ins</h1>
          </div>
          <div className="who">
            <span>{me.name} ({me.role})</span>
            <button className="btn small ghost" onClick={() => void supabase?.auth.signOut()}>Log out</button>
          </div>
        </div>
        <div className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setToast(null); setTab(id); }}>{label}</button>
          ))}
        </div>
      </header>
      <div className="wrap">
        <main>
          {tab === "checkin" && (
            <CheckinTab me={me} mode={mode} setMode={setMode} readOnly={false} messages={messages}
              result={smsResult} onSubmitForm={submitForm} onSendSms={sendSms} onGotoFeed={goFeed} />
          )}
          {tab === "feed" && (
            <Feed checkins={checkins} team={team} me={me.name} filter={filter} setFilter={setFilter} toast={toast}
              loading={loading} onResolve={resolve} onReply={reply} />
          )}
          {tab === "report" && <Report checkins={checkins} team={team} view={view} setView={setView} />}
        </main>
      </div>
    </>
  );
}

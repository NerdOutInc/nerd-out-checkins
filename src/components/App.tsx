"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createRepo, DEFAULT_TEAM } from "@/lib/db";
import type { Checkin, SmsMessage, Tab, Team } from "@/lib/types";
import { nowTime, today } from "@/lib/dates";
import { confirmText, parseText, tidy } from "@/lib/sms";
import Feed from "./Feed";
import CheckinTab, { type SmsResult } from "./CheckinTab";
import Report from "./Report";

const TABS: [Tab, string][] = [["checkin", "Check in"], ["feed", "Feed"], ["report", "Report"]];
const PREFS_KEY = "nerdout.prefs";

export default function App() {
  const repo = useMemo(createRepo, []);
  const [mounted, setMounted] = useState(false);
  const [team, setTeam] = useState<Team>(DEFAULT_TEAM);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [smsResult, setSmsResult] = useState<SmsResult>(null);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [me, setMe] = useState(DEFAULT_TEAM.owner);
  const [tab, setTab] = useState<Tab>("feed");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState<"today" | "week">("today");
  const [mode, setMode] = useState<"form" | "text">("form");

  // Per-browser preferences (swap for a per-user Supabase row once auth exists)
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
      if (p.me) setMe(p.me);
      if (["checkin", "feed", "report"].includes(p.tab)) setTab(p.tab);
      if (p.filter) setFilter(p.filter);
      if (p.view === "week") setView("week");
      if (p.mode === "text") setMode("text");
    } catch { /* ignore */ }
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted) try { localStorage.setItem(PREFS_KEY, JSON.stringify({ me, tab, filter, view, mode })); } catch { /* ignore */ }
  }, [mounted, me, tab, filter, view, mode]);

  const refresh = useCallback(async () => {
    try { setCheckins(await repo.listCheckins()); }
    catch { setToast({ text: "Couldn't load check-ins. Check your connection.", bad: true }); }
    finally { setLoading(false); }
  }, [repo]);
  const refreshSms = useCallback(async () => {
    try { setMessages(await repo.listSms(me, today())); } catch { /* keep current */ }
  }, [repo, me]);

  useEffect(() => { void repo.getTeam().then(setTeam).catch(() => {}); void refresh(); }, [repo, refresh]);
  useEffect(() => {
    const onFocus = () => { void refresh(); void refreshSms(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh, refreshSms]);
  useEffect(() => { void refreshSms(); }, [refreshSms]);
  useEffect(() => { if (!team.members.concat([{ name: team.owner, role: "" }]).some((m) => m.name === me)) setMe(team.owner); }, [team, me]);

  async function save(fn: () => Promise<void>) {
    try { await fn(); return true; }
    catch { setToast({ text: "Couldn't save that. Check your connection and try again.", bad: true }); return false; }
  }
  const goFeed = () => { setToast(null); setFilter("all"); setTab("feed"); };

  async function submitForm(v: { done: string; plan: string; blocked: string }) {
    const ok = await save(() => repo.addCheckin({ person: me, date: today(), time: nowTime(), via: "web", ...v }));
    if (!ok) return false;
    await refresh();
    goFeed();
    setToast({ text: "Check-in posted. It's at the top of today's feed." });
    return true;
  }

  async function sendSms(text: string) {
    const t = nowTime(), date = today();
    const existing = checkins.find((c) => c.person === me && c.date === date && c.via === "text");
    if (existing) {
      await save(async () => {
        await repo.patchCheckin(existing.id, { replies: [...existing.replies, { by: me, date, time: t, text }] });
        await repo.addSms(me, date, [{ dir: "in", time: t, text }, { dir: "out", time: t, text: "Added to today's check-in." }]);
      });
      setSmsResult({ c: existing, added: true });
    } else {
      const parsed = parseText(text);
      if (!parsed.done && !parsed.plan && !parsed.blocked) parsed.done = tidy(text);
      const c = { person: me, date, time: t, via: "text" as const, raw: text, ...parsed };
      await save(async () => {
        await repo.addSms(me, date, [{ dir: "in", time: t, text }, { dir: "out", time: t, text: confirmText(c, team.owner) }]);
        await repo.addCheckin(c);
      });
      setSmsResult({ c, added: false });
    }
    await Promise.all([refresh(), refreshSms()]);
  }

  async function reply(c: Checkin, text: string) {
    const r = { by: me, date: today(), time: nowTime(), text };
    const ok = await save(async () => {
      await repo.patchCheckin(c.id, { replies: [...c.replies, r] });
      // A reply to a texted check-in also lands on that person's phone
      if (c.via === "text" && me !== c.person) await repo.addSms(c.person, c.date, [{ dir: "out", time: r.time, text: `${me}: ${text}` }]);
    });
    await Promise.all([refresh(), refreshSms()]);
    return ok;
  }

  async function resolve(c: Checkin) {
    await save(() => repo.patchCheckin(c.id, {
      resolved: true,
      replies: [...c.replies, { by: me, date: today(), time: nowTime(), text: "Marked this blocker resolved." }],
    }));
    await refresh();
  }

  if (!mounted) return null;
  const names = [team.owner, ...team.members.map((m) => m.name)];
  return (
    <>
      <header>
        <div className="head-row">
          <div>
            <div className="eyebrow">Nerd Out, Inc.</div>
            <h1>Daily Check-ins</h1>
          </div>
          <label className="who" htmlFor="me">You are
            <select id="me" value={me} onChange={(e) => { setMe(e.target.value); setSmsResult(null); }}>
              {names.map((n) => <option key={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} onClick={() => { setToast(null); setTab(id); }}>{label}</button>
          ))}
        </div>
      </header>
      <div className="wrap">
        <main>
          {repo.mode === "local" && (
            <div className="toast">Demo mode: no database configured, so data resets when you reload. See the README to connect Supabase.</div>
          )}
          {tab === "checkin" && (
            <CheckinTab team={team} me={me} mode={mode} setMode={setMode} readOnly={false} messages={messages}
              result={smsResult} onSubmitForm={submitForm} onSendSms={sendSms} onGotoFeed={goFeed} />
          )}
          {tab === "feed" && (
            <Feed checkins={checkins} team={team} me={me} filter={filter} setFilter={setFilter} toast={toast}
              loading={loading} onResolve={resolve} onReply={reply} />
          )}
          {tab === "report" && <Report checkins={checkins} team={team} view={view} setView={setView} />}
        </main>
      </div>
    </>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import type { Checkin, Profile, SmsMessage } from "@/lib/types";
import { fmtTime } from "@/lib/dates";
import { REMINDER_TEXT, REMINDER_TIME } from "@/lib/sms";
import { Multiline } from "./Feed";

export type SmsResult = { c: Pick<Checkin, "person" | "done" | "plan" | "blocked">; added: boolean } | null;

function Sec({ label, val }: { label: string; val: string }) {
  return <div className="sec"><div className="sec-label">{label}</div>
    <p>{val ? <Multiline text={val} /> : <span className="role">Nothing found</span>}</p></div>;
}

export default function CheckinTab({ me, mode, setMode, readOnly, messages, result, onSubmitForm, onSendSms, onGotoFeed }: {
  me: Profile; mode: "form" | "text"; setMode: (m: "form" | "text") => void; readOnly: boolean;
  messages: SmsMessage[]; result: SmsResult;
  onSubmitForm: (v: { done: string; plan: string; blocked: string }) => Promise<boolean>;
  onSendSms: (text: string) => Promise<void>; onGotoFeed: () => void;
}) {
  const [done, setDone] = useState(""), [plan, setPlan] = useState(""), [blocked, setBlocked] = useState("");
  const [error, setError] = useState(""), [sms, setSms] = useState("");
  const thread = useRef<HTMLDivElement>(null);
  const log: SmsMessage[] = [{ dir: "out", time: REMINDER_TIME, text: REMINDER_TEXT }, ...messages];
  useEffect(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight; }, [messages, mode]);

  const sendSms = async () => {
    const text = sms.trim();
    if (!text || readOnly) return;
    setSms("");
    await onSendSms(text);
  };

  return (
    <section>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="toggle mode">
          <button aria-pressed={mode === "form"} onClick={() => setMode("form")}>Web form</button>
          <button aria-pressed={mode === "text"} onClick={() => setMode("text")}>Text message (simulated)</button>
        </div>

        {mode === "text" && (
          <div className="sms-layout">
            <div className="phone">
              <div className="phone-top"><b>Nerd Out Check-ins</b><span>(701) 555-0142</span></div>
              <div className="thread" ref={thread}>
                {log.map((m, i) => (
                  <div key={i} style={{ display: "contents" }}>
                    <div className={`bubble ${m.dir}`}>{m.text}</div>
                    <div className={`bubble-time ${m.dir}`}>{fmtTime(m.time)}</div>
                  </div>
                ))}
              </div>
              <form className="sms-input" onSubmit={(e) => { e.preventDefault(); void sendSms(); }}>
                <textarea value={sms} onChange={(e) => setSms(e.target.value)} placeholder="Text message" aria-label="Text message"
                  disabled={readOnly}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendSms(); } }} />
                <button className="btn small" type="submit" disabled={readOnly}>Send</button>
              </form>
            </div>
            <div className="sms-side">
              <div className="panel">
                <h3>How this works</h3>
                <p className="muted">Texting as <b>{me.name}</b>.</p>
                <p className="muted">Reply to the reminder in plain words. The app sorts each sentence into Done, Tomorrow, or Blocked, saves it to the feed, and texts back a confirmation. A second text the same day gets added to that check-in as a reply. When the owner replies in the feed, the reply shows up here as a text.</p>
                <p className="muted">This uses a simple keyword sorter. A live version could use AI, which handles messier wording.</p>
              </div>
              {result && (
                <div className="panel">
                  {result.added ? <>
                    <h3>Added as a reply</h3>
                    <p className="muted">{result.c.person} already texted in today, so this went onto that check-in as a reply.</p>
                  </> : <>
                    <h3>How it was logged</h3>
                    <Sec label="Done" val={result.c.done} /><Sec label="Tomorrow" val={result.c.plan} />
                    {result.c.blocked ? <div className="blocker"><Sec label="Blocked on" val={result.c.blocked} /></div> : <Sec label="Blocked on" val="" />}
                  </>}
                  <button className="btn small ghost" onClick={onGotoFeed}>See it in the feed</button>
                </div>
              )}
            </div>
          </div>
        )}

        {mode === "form" && (
          <form className="form" onSubmit={async (e) => {
            e.preventDefault();
            if (!done.trim() || !plan.trim()) { setError("Fill in what you got done and your plan for tomorrow."); return; }
            setError("");
            if (await onSubmitForm({ done: done.trim(), plan: plan.trim(), blocked: blocked.trim() })) {
              setDone(""); setPlan(""); setBlocked("");
            }
          }}>
            <h2>End-of-day check-in</h2>
            <div className="posting-as">Posting as <b>{me.name}</b> ({me.role}).</div>
            <label>What did you get done today?
              <textarea value={done} onChange={(e) => setDone(e.target.value)} placeholder="Shipped the signup form, reviewed Maya's PR..." /></label>
            <label>What&apos;s your plan for tomorrow?
              <textarea value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Hook the form up to the email list..." /></label>
            <label>Blocked on anything? <span className="hint">Leave empty if not.</span>
              <textarea value={blocked} onChange={(e) => setBlocked(e.target.value)} placeholder="Waiting on access to..." /></label>
            {error && <div className="error">{error}</div>}
            <button className="btn" type="submit" disabled={readOnly}>Post check-in</button>
          </form>
        )}
      </div>
    </section>
  );
}

"use client";
import { useState } from "react";
import type { Checkin, Team } from "@/lib/types";
import { dayLabel, fmtDay, fmtTime, initials } from "@/lib/dates";

export const FILTERS = [
  { id: "all", label: "All" }, { id: "open", label: "Open blockers" },
  { id: "Developer", label: "Developers" }, { id: "Researcher", label: "Researchers" },
  { id: "Account admin", label: "Account admins" },
];

export const roleOf = (team: Team, userId: string | null, name: string) => {
  const all = team.owner ? [team.owner, ...team.members] : team.members;
  return (all.find((m) => m.id === userId) ?? all.find((m) => m.name === name))?.role ?? "";
};

export function Multiline({ text }: { text: string }) {
  return <>{text.split("\n").map((l, i) => (i ? [<br key={"b" + i} />, l] : l))}</>;
}

function Card({ c, team, me, onResolve, onReply }: {
  c: Checkin; team: Team; me: string;
  onResolve: (c: Checkin) => void; onReply: (c: Checkin, text: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState("");
  return (
    <article className="card">
      <div className="card-top">
        <div className="avatar">{initials(c.person)}</div>
        <div><div className="name">{c.person}</div><div className="role">{roleOf(team, c.user_id, c.person)}</div></div>
        {c.blocked && <span className={`pill ${c.resolved ? "resolved" : "blocked"}`}>{c.resolved ? "Resolved" : "Blocked"}</span>}
        {c.via === "text" && <span className="tag">via text</span>}
        <div className="time">{fmtTime(c.time)}</div>
      </div>
      <div className="sec"><div className="sec-label">Done</div>
        <p>{c.done ? <Multiline text={c.done} /> : <span className="role">Nothing listed</span>}</p></div>
      <div className="sec"><div className="sec-label">Tomorrow</div>
        <p>{c.plan ? <Multiline text={c.plan} /> : <span className="role">Nothing listed</span>}</p></div>
      {c.blocked && (
        <div className={`blocker ${c.resolved ? "is-resolved" : ""}`}>
          <div className="sec"><div className="sec-label">Blocked on</div><p><Multiline text={c.blocked} /></p></div>
          {!c.resolved && <button className="btn small ok" onClick={() => onResolve(c)}>Mark resolved</button>}
        </div>
      )}
      {c.raw && <details className="raw"><summary>Original text</summary><p><Multiline text={c.raw} /></p></details>}
      <div className="replies">
        {c.replies.map((r, i) => (
          <div className="reply" key={i}>
            <div className={`r-by ${r.by === team.owner?.name ? "owner" : ""}`}>{r.by}
              <small>{r.date && r.date !== c.date ? fmtDay(r.date) + ", " : ""}{fmtTime(r.time)}</small></div>
            <p><Multiline text={r.text} /></p>
          </div>
        ))}
        <form className="reply-form" onSubmit={async (e) => {
          e.preventDefault();
          const text = draft.trim();
          if (!text) return;
          setDraft("");
          if (!(await onReply(c, text))) setDraft(text);
        }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            placeholder={`Reply as ${me}...`} aria-label={`Reply to ${c.person}`} />
          <button className="btn small ghost" type="submit">Reply</button>
        </form>
      </div>
    </article>
  );
}

export default function Feed({ checkins, team, me, filter, setFilter, toast, loading, onResolve, onReply }: {
  checkins: Checkin[]; team: Team; me: string; filter: string; setFilter: (f: string) => void;
  toast: { text: string; bad?: boolean } | null; loading: boolean;
  onResolve: (c: Checkin) => void; onReply: (c: Checkin, text: string) => Promise<boolean>;
}) {
  const list = checkins
    .filter((c) => filter === "all" ? true : filter === "open" ? c.blocked && !c.resolved : roleOf(team, c.user_id, c.person) === filter)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  let lastDate = "";
  return (
    <section>
      <div style={{ display: "grid", gap: 14 }}>
        {toast && <div className={`toast ${toast.bad ? "bad" : ""}`}>{toast.text}</div>}
        <div className="filters">
          {FILTERS.map((f) => (
            <button key={f.id} className="chip" aria-pressed={f.id === filter} onClick={() => setFilter(f.id)}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {loading ? <div className="empty"><b>Loading check-ins</b>Pulling the latest from the database.</div>
            : !checkins.length ? <div className="empty"><b>No check-ins yet</b>Post the first one from the Check in tab.</div>
            : !list.length ? <div className="empty">Nothing here. Try another filter.</div>
            : list.map((c) => {
              const head = c.date !== lastDate;
              lastDate = c.date;
              return (
                <div key={c.id} style={{ display: "contents" }}>
                  {head && <div className="day-head"><h3>{dayLabel(c.date)}</h3><span>{fmtDay(c.date)}</span></div>}
                  <Card c={c} team={team} me={me} onResolve={onResolve} onReply={onReply} />
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}

"use client";
import type { Checkin, Team } from "@/lib/types";
import { daysBetween, fmtDay, today, toDate, weekDays } from "@/lib/dates";
import { Multiline, roleOf } from "./Feed";

const Who = ({ team, c }: { team: Team; c: Checkin }) =>
  <div className="who-col">{c.person}<small>{roleOf(team, c.user_id, c.person)}</small></div>;

function Today({ checkins, team }: { checkins: Checkin[]; team: Team }) {
  const t = today();
  const todays = checkins.filter((c) => c.date === t);
  const inIds = new Set(todays.map((c) => c.user_id));
  const missing = team.members.filter((m) => !inIds.has(m.id));
  const open = checkins.filter((c) => c.blocked && !c.resolved).sort((a, b) => a.date.localeCompare(b.date));
  return <>
    <div className="stats">
      <div className="stat"><div className="num">{team.members.filter((m) => inIds.has(m.id)).length}/{team.members.length}</div><div className="lbl">checked in</div></div>
      <div className="stat"><div className={`num ${open.length ? "bad" : ""}`}>{open.length}</div><div className="lbl">open blockers</div></div>
      <div className="stat"><div className={`num ${missing.length ? "bad" : ""}`}>{missing.length}</div><div className="lbl">missing</div></div>
    </div>
    <div className="panel"><h3>Who checked in</h3>
      <div className="people">{team.members.map((m) => {
        const ok = inIds.has(m.id);
        return <span key={m.id} className={`person ${ok ? "" : "missing"}`}>{m.name}{ok ? "" : " (missing)"}</span>;
      })}</div>
    </div>
    <div className="panel"><h3>Open blockers</h3>
      {open.length ? open.map((c) => {
        const age = daysBetween(c.date, t);
        return <div className="row" key={c.id}><Who team={team} c={c} />
          <div><p><Multiline text={c.blocked} /></p>
            <span className="age">{age === 0 ? "raised today" : `open ${age} day${age > 1 ? "s" : ""}`}</span></div></div>;
      }) : <p className="role">No open blockers.</p>}
    </div>
    <div className="panel"><h3>Plans for tomorrow</h3>
      {todays.length ? todays.map((c) => <div className="row" key={c.id}><Who team={team} c={c} />
        <p>{c.plan ? <Multiline text={c.plan} /> : <span className="role">Nothing listed</span>}</p></div>)
        : <p className="role">No check-ins yet today.</p>}
    </div>
  </>;
}

function Week({ checkins, team }: { checkins: Checkin[]; team: Team }) {
  const t = today(), days = weekDays();
  const elapsed = days.filter((d) => d <= t);
  const week = checkins.filter((c) => days.includes(c.date));
  const raised = week.filter((c) => c.blocked);
  const resolved = raised.filter((c) => c.resolved);
  const wk = (d: string) => toDate(d).toLocaleDateString("en-US", { weekday: "short" });
  const totalPossible = team.members.length * elapsed.length;
  const totalIn = team.members.reduce((n, m) =>
    n + elapsed.filter((d) => week.some((c) => c.user_id === m.id && c.date === d)).length, 0);
  return <>
    <div className="stats">
      <div className="stat"><div className="num">{totalPossible ? Math.round((totalIn / totalPossible) * 100) : 0}%</div><div className="lbl">check-in rate</div></div>
      <div className="stat"><div className="num">{raised.length}</div><div className="lbl">blockers raised</div></div>
      <div className="stat"><div className={`num ${resolved.length < raised.length ? "bad" : ""}`}>{resolved.length}</div><div className="lbl">resolved</div></div>
    </div>
    <div className="panel"><h3>Check-ins by day</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Person</th>{days.map((d) => <th className="c" key={d}>{wk(d)}</th>)}<th>Rate</th></tr></thead>
        <tbody>{team.members.map((m) => {
          const daysIn = new Set(week.filter((c) => c.user_id === m.id).map((c) => c.date));
          const count = elapsed.filter((d) => daysIn.has(d)).length;
          return <tr key={m.id}>
            <td><b>{m.name}</b><br /><span className="role">{m.role}</span></td>
            {days.map((d) => {
              const cls = d > t ? "future" : daysIn.has(d) ? "yes" : "no";
              const lbl = `${fmtDay(d)}: ${d > t ? "not yet" : daysIn.has(d) ? "checked in" : "missed"}`;
              return <td className="c" key={d}><span className={`dot ${cls}`} title={lbl} aria-label={lbl} /></td>;
            })}
            <td className={`rate ${count < elapsed.length ? "low" : ""}`}>{count}/{elapsed.length}</td>
          </tr>;
        })}</tbody>
      </table></div>
    </div>
    <div className="panel"><h3>What got done</h3>
      {team.members.map((m) => {
        const mine = week.filter((c) => c.user_id === m.id).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        return <details key={m.id}><summary>{m.name} <small>{mine.length} update{mine.length === 1 ? "" : "s"}</small></summary>
          <ul>{mine.length ? mine.map((c) => <li key={c.id}><span>{wk(c.date)}</span>{c.done}</li>) : <li>No check-ins this week.</li>}</ul></details>;
      })}
    </div>
  </>;
}

export default function Report({ checkins, team, view, setView }: {
  checkins: Checkin[]; team: Team; view: "today" | "week"; setView: (v: "today" | "week") => void;
}) {
  return (
    <section>
      <div style={{ display: "grid", gap: 14 }}>
        <div className="report-head">
          <h2>{view === "today" ? `Today, ${fmtDay(today())}` : `Week of ${fmtDay(weekDays()[0])}`}</h2>
          <div className="toggle">
            <button aria-pressed={view === "today"} onClick={() => setView("today")}>Today</button>
            <button aria-pressed={view === "week"} onClick={() => setView("week")}>This week</button>
          </div>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          {view === "today" ? <Today checkins={checkins} team={team} /> : <Week checkins={checkins} team={team} />}
        </div>
      </div>
    </section>
  );
}

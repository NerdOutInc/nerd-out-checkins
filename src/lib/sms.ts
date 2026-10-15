import type { Checkin } from "./types";

export const REMINDER_TIME = "16:30";
export const REMINDER_TEXT =
  "Nerd Out check-in: What did you get done today, what's the plan for tomorrow, and is anything blocking you? Just reply here.";

const BLOCKED_WORDS = ["blocked", "blocker", "stuck", "waiting on", "waiting for", "still waiting",
  "need help", "need access", "need your", "need nick", "can't", "cant", "cannot", "held up", "hung up"];
const PLAN_WORDS = ["tomorrow", "tmrw", "tmr", "next up", "plan", "planning", "going to", "gonna", "will", "i'll"];

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (words: string[]) => new RegExp("\\b(" + words.map(escRe).join("|") + ")\\b", "i");
const BLOCKED_RE = wordRe(BLOCKED_WORDS);
const PLAN_RE = wordRe(PLAN_WORDS);
const NO_BLOCKER_RE = /^(no|not|nothing|zero|none)\b.*\b(block|blocked|blocker|blockers|blocking)\b/i;
const NONE_RE = /^(none|no|nothing|n\/a|nope)\.?$/i;
const LABELS: [RegExp, "done" | "plan" | "blocked"][] = [
  [/^(done|did|today|finished)\s*[:\-]\s*/i, "done"],
  [/^(tomorrow|tmrw|plan|next)\s*[:\-]\s*/i, "plan"],
  [/^(blocked on|blocked|blockers?|stuck)\s*[:\-]\s*/i, "blocked"],
];

function splitPieces(raw: string) {
  const triggers = [...BLOCKED_WORDS, ...PLAN_WORDS, "no blockers", "nothing blocking", "not blocked"]
    .map(escRe).join("|");
  return raw.split(/\n+|(?<=[.!?;])\s+/)
    .flatMap((p) => p.split(new RegExp(`,\\s*(?:and\\s+|but\\s+)?(?=(?:${triggers})\\b)`, "i")))
    .flatMap((p) => p.split(/\s+(?:and|but)\s+(?=(?:tomorrow|tmrw|blocked|stuck|still waiting|waiting on)\b)/i))
    .map((s) => s.trim().replace(/^[-•*]\s*/, "").replace(/[;,]$/, ""))
    .filter(Boolean);
}

export function tidy(s: string) {
  s = s.charAt(0).toUpperCase() + s.slice(1);
  return /[.!?]$/.test(s) ? s : s + ".";
}

/** Simple keyword sorter. Swap for an LLM call later (see README roadmap). */
export function parseText(raw: string) {
  const out: Record<"done" | "plan" | "blocked", string[]> = { done: [], plan: [], blocked: [] };
  for (let p of splitPieces(raw)) {
    let bucket: "done" | "plan" | "blocked" | null = null;
    for (const [re, b] of LABELS) {
      if (re.test(p)) { bucket = b; p = p.replace(re, ""); break; }
    }
    if (!p || NO_BLOCKER_RE.test(p) || (bucket === "blocked" && NONE_RE.test(p))) continue;
    if (!bucket) bucket = BLOCKED_RE.test(p) ? "blocked" : PLAN_RE.test(p) ? "plan" : "done";
    out[bucket].push(tidy(p));
  }
  return { done: out.done.join(" "), plan: out.plan.join(" "), blocked: out.blocked.join(" ") };
}

export function confirmText(c: Pick<Checkin, "person" | "plan" | "blocked">, owner: string) {
  let msg = `Got it, ${c.person.split(" ")[0]}. Logged to today's check-in.`;
  if (!c.plan) msg += " Nothing listed for tomorrow yet. Text again to add it.";
  if (c.blocked) {
    const short = c.blocked.length > 70 ? c.blocked.slice(0, 67) + "..." : c.blocked;
    msg += ` Blocker flagged for ${owner}: "${short}"`;
  } else msg += " No blockers.";
  return msg;
}

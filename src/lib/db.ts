import { createClient } from "@supabase/supabase-js";
import type { Checkin, NewCheckin, SmsMessage, Team } from "./types";

export const DEFAULT_TEAM: Team = {
  owner: "Nick",
  members: [
    { name: "Maya Chen", role: "Developer" }, { name: "Luis Ortega", role: "Developer" },
    { name: "Sam Patel", role: "Developer" }, { name: "Priya Raman", role: "Researcher" },
    { name: "Ben Holt", role: "Researcher" }, { name: "Jess Kowalski", role: "Account admin" },
    { name: "Tom Reyes", role: "Account admin" },
  ],
};

export interface Repo {
  mode: "supabase" | "local";
  getTeam(): Promise<Team>;
  listCheckins(): Promise<Checkin[]>;
  addCheckin(c: NewCheckin): Promise<void>;
  patchCheckin(id: string, patch: Partial<Pick<Checkin, "resolved" | "replies">>): Promise<void>;
  listSms(person: string, date: string): Promise<SmsMessage[]>;
  addSms(person: string, date: string, msgs: SmsMessage[]): Promise<void>;
}

function supabaseRepo(url: string, key: string): Repo {
  const sb = createClient(url, key);
  const check = <T extends { error: { message: string } | null }>(r: T) => {
    if (r.error) throw new Error(r.error.message);
    return r;
  };
  return {
    mode: "supabase",
    async getTeam() {
      const { data } = check(await sb.from("team_members").select("name, role, is_owner").order("position"));
      if (!data?.length) return DEFAULT_TEAM;
      return {
        owner: data.find((m) => m.is_owner)?.name ?? DEFAULT_TEAM.owner,
        members: data.filter((m) => !m.is_owner).map(({ name, role }) => ({ name, role })),
      };
    },
    async listCheckins() {
      const { data } = check(await sb.from("checkins").select("*").order("date", { ascending: false }).limit(1000));
      return (data ?? []) as Checkin[];
    },
    async addCheckin(c) {
      check(await sb.from("checkins").insert({ resolved: false, replies: [], ...c }));
    },
    async patchCheckin(id, patch) {
      check(await sb.from("checkins").update(patch).eq("id", id));
    },
    async listSms(person, date) {
      const { data } = check(await sb.from("sms_messages").select("dir, time, text")
        .eq("person", person).eq("date", date).order("created_at"));
      return (data ?? []) as SmsMessage[];
    },
    async addSms(person, date, msgs) {
      check(await sb.from("sms_messages").insert(msgs.map((m) => ({ ...m, person, date }))));
    },
  };
}

/** In-memory fallback so the app runs with no backend configured. Resets on reload. */
function localRepo(): Repo {
  let checkins: Checkin[] = [];
  const sms: Record<string, SmsMessage[]> = {};
  return {
    mode: "local",
    getTeam: async () => DEFAULT_TEAM,
    listCheckins: async () => [...checkins],
    async addCheckin(c) {
      checkins = [...checkins, { resolved: false, replies: [], ...c, id: "local-" + Date.now() + Math.random() }];
    },
    async patchCheckin(id, patch) {
      checkins = checkins.map((c) => (c.id === id ? { ...c, ...patch } : c));
    },
    listSms: async (p, d) => [...(sms[`${p}_${d}`] ?? [])],
    async addSms(p, d, msgs) {
      sms[`${p}_${d}`] = [...(sms[`${p}_${d}`] ?? []), ...msgs];
    },
  };
}

export function createRepo(): Repo {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key ? supabaseRepo(url, key) : localRepo();
}

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Checkin, NewCheckin, Profile, SmsMessage, Team } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** One shared client per browser session. Null when env vars are missing. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null;

function sb() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}
function check<T extends { error: { message: string } | null }>(r: T) {
  if (r.error) throw new Error(r.error.message);
  return r;
}

type ProfileRow = { id: string; name: string; role: string; is_owner: boolean };
const toProfile = (r: ProfileRow): Profile => ({ id: r.id, name: r.name, role: r.role, isOwner: r.is_owner });

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = check(await sb().from("profiles").select("id, name, role, is_owner").eq("id", userId).maybeSingle());
  return data ? toProfile(data as ProfileRow) : null;
}

export async function getTeam(): Promise<Team> {
  const { data } = check(await sb().from("profiles").select("id, name, role, is_owner").order("created_at"));
  const all = ((data ?? []) as ProfileRow[]).map(toProfile);
  const owner = all.find((p) => p.isOwner) ?? null;
  return { owner, members: all.filter((p) => !p.isOwner).map(({ id, name, role }) => ({ id, name, role })) };
}

export async function listCheckins(): Promise<Checkin[]> {
  const { data } = check(await sb().from("checkins").select("*").order("date", { ascending: false }).limit(1000));
  return (data ?? []) as Checkin[];
}
export async function addCheckin(c: NewCheckin) {
  check(await sb().from("checkins").insert(c));
}
export async function patchCheckin(id: string, patch: Partial<Pick<Checkin, "resolved" | "replies">>) {
  check(await sb().from("checkins").update(patch).eq("id", id));
}

export async function listSms(userId: string, date: string): Promise<SmsMessage[]> {
  const { data } = check(await sb().from("sms_messages").select("dir, time, text")
    .eq("user_id", userId).eq("date", date).order("created_at").order("id"));
  return (data ?? []) as SmsMessage[];
}
export async function addSms(userId: string, date: string, msgs: SmsMessage[]) {
  check(await sb().from("sms_messages").insert(msgs.map((m) => ({ ...m, user_id: userId, date }))));
}

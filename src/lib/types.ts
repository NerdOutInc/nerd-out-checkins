export type Member = { id: string; name: string; role: string };
export type Reply = { by: string; date: string; time: string; text: string };
export type Checkin = {
  id: string;
  user_id: string | null;
  person: string; // display name at time of posting
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  done: string;
  plan: string;
  blocked: string;
  resolved: boolean;
  replies: Reply[];
  via: "web" | "text";
  raw?: string | null;
};
export type NewCheckin = Omit<Checkin, "id" | "resolved" | "replies">;
export type SmsMessage = { dir: "in" | "out"; time: string; text: string };
export type Profile = Member & { isOwner: boolean };
/** owner is null until the first account exists; members excludes the owner. */
export type Team = { owner: Member | null; members: Member[] };
export type Tab = "checkin" | "feed" | "report";
export const ROLES = ["Developer", "Researcher", "Account admin"] as const;

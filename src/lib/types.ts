export type Reply = { by: string; date: string; time: string; text: string };
export type TeamMember = { name: string; role: string };
export type Checkin = {
  id: string;
  person: string;
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
export type NewCheckin = Omit<Checkin, "id" | "resolved" | "replies"> &
  Partial<Pick<Checkin, "resolved" | "replies">>;
export type SmsMessage = { dir: "in" | "out"; time: string; text: string };
export type Team = { owner: string; members: TeamMember[] };
export type Tab = "checkin" | "feed" | "report";

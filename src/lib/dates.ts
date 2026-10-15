export const today = () => new Date().toLocaleDateString("en-CA");
export const toDate = (d: string) => new Date(d + "T12:00:00");
export const daysBetween = (a: string, b: string) => Math.round((+toDate(b) - +toDate(a)) / 86400000);
export function addDays(d: string, n: number) {
  const x = toDate(d);
  x.setDate(x.getDate() + n);
  return x.toLocaleDateString("en-CA");
}
export function fmtTime(t?: string) {
  if (!t) return "";
  let [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}
export const fmtDay = (d: string) =>
  toDate(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export function dayLabel(d: string) {
  const diff = daysBetween(d, today());
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return toDate(d).toLocaleDateString("en-US", { weekday: "long" });
}
export function nowTime() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}
export function weekDays() {
  const t = today();
  const dow = toDate(t).getDay();
  const monday = addDays(t, dow === 0 ? -6 : 1 - dow);
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}
export const initials = (name: string) =>
  name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

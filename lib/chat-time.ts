/** Time labels for the messages screens, in the viewer's own time zone. Call on the client only. */

const pad = (n: number) => String(n).padStart(2, "0");

/** HH:MM, the same in every language (matches the game and the slot times). */
export function clockTime(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Whole local days between the message and now: 0 today, 1 yesterday. */
function daysAgo(iso: string, now: number) {
  const then = new Date(iso);
  then.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/** "Today", "Yesterday", a weekday this week, else a short date. Used for the day dividers. */
export function dayLabel(iso: string, now: number, tag: string) {
  const ago = daysAgo(iso, now);
  if (ago <= 1) {
    const text = new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(-ago, "day");
    return text.charAt(0).toLocaleUpperCase(tag) + text.slice(1);
  }
  const date = new Date(iso);
  if (ago < 7) return date.toLocaleDateString(tag, { weekday: "long" });
  return date.toLocaleDateString(tag, { day: "numeric", month: "short", year: ago > 300 ? "numeric" : undefined });
}

/** Time for the conversation list: HH:MM today, otherwise the day label. */
export function listTime(iso: string, now: number, tag: string) {
  return daysAgo(iso, now) === 0 ? clockTime(iso) : dayLabel(iso, now, tag);
}

/** True when two timestamps fall on different local days. */
export function differentDay(a: string, b: string) {
  return new Date(a).toDateString() !== new Date(b).toDateString();
}

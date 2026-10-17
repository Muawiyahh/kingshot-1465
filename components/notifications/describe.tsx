import type { ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  CalendarCheck,
  CalendarMinus,
  CalendarRange,
  CalendarX,
  CircleX,
  Clock,
  Crown,
  HeartHandshake,
  Hourglass,
  Megaphone,
  ShieldCheck,
  Swords,
  Trophy,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import { LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { positionLabel } from "@/lib/kvk";
import { site } from "@/lib/site";
import type { AppNotification, UserRole } from "@/lib/types";

export type Tone = "success" | "gold" | "primary" | "muted";

export type Described = { icon: LucideIcon; tone: Tone; text: ReactNode; href: string };

/** How many Hall of Fame names a notification spells out before "and N more". */
const NAMES_SHOWN = 3;

const str = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-fg">{children}</strong>;
}

/** "Construction" style names go through the translated position list; custom ones stay as typed. */
function slotName(data: Record<string, unknown>, t: Messages) {
  return `${fmt(t.common.day, { n: num(data.day) })} · ${positionLabel(str(data.position), t)}`;
}

/** The schedule, opened at the player's slot when the notification knows it. */
function scheduleLink(data: Record<string, unknown>) {
  const day = str(data.day_id);
  return day && data.slot !== undefined ? `/account/schedule?day=${day}&slot=${num(data.slot)}` : "/account/schedule";
}

function nameWithTag(name: string, tag: string) {
  return tag ? `${name} [${tag}]` : name;
}

/**
 * The sentence, icon and link for a notification, in the reader's language, or null for a kind
 * this version of the site doesn't know. Leaders' KvK links go to Admin → KvK events, since they
 * don't apply for positions themselves.
 */
export function describe(n: AppNotification, t: Messages, locale: Locale, leader = false): Described | null {
  const k = t.notifications.kinds;
  const d = n.data ?? {};
  const tag = LOCALE_INFO[locale].tag;
  const day = (iso: string) =>
    new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(tag, { day: "numeric", month: "short", timeZone: "UTC" });
  const event = <Strong>{str(d.event)}</Strong>;
  const slot = <Strong>{slotName(d, t)}</Strong>;

  switch (n.kind) {
    case "account_approved":
      return { icon: BadgeCheck, tone: "success", text: k.accountApproved, href: "/account" };
    case "account_rejected":
      return { icon: CircleX, tone: "muted", text: k.accountRejected, href: "/account" };
    case "role": {
      const role = str(d.role) as UserRole;
      const label = t.admin.accounts.roles[role] ?? role;
      return {
        icon: ShieldCheck,
        tone: "gold",
        text: rich(k.role, { role: <Strong>{label}</Strong> }),
        href: role === "player" ? "/account" : "/admin",
      };
    }
    case "member":
      return {
        icon: HeartHandshake,
        tone: "gold",
        text: fmt(k.member, { kingdom: fmt(t.common.kingdomName, { n: site.kingdom }) }),
        href: "/account",
      };
    case "application_accepted":
      // With a time once they've been put in a slot (0011_appointments.sql).
      return d.time
        ? {
            icon: CalendarCheck,
            tone: "success",
            text: rich(k.applicationAcceptedAt, { slot, event, time: <Strong>{str(d.time)}</Strong> }),
            href: scheduleLink(d),
          }
        : { icon: CalendarCheck, tone: "success", text: rich(k.applicationAccepted, { slot, event }), href: "/account/appointments" };
    case "application_rejected":
      return { icon: CalendarX, tone: "muted", text: rich(k.applicationRejected, { slot, event }), href: "/account/appointments" };
    case "slot_assigned":
      return {
        icon: Clock,
        tone: "primary",
        text: rich(k.slotAssigned, { event, slot, time: <Strong>{str(d.time)}</Strong> }),
        href: scheduleLink(d),
      };
    case "slot_removed":
      return { icon: CalendarMinus, tone: "muted", text: rich(k.slotRemoved, { event, slot }), href: "/account/appointments" };
    case "kvk_open":
      return { icon: Megaphone, tone: "primary", text: rich(k.kvkOpen, { event }), href: leader ? "/admin/events" : "/account/appointments" };
    case "kvk_published":
      return { icon: CalendarRange, tone: "primary", text: rich(k.kvkPublished, { event }), href: leader ? "/admin/events" : "/account/schedule" };
    case "next_kvk": {
      const at = new Date(str(d.at));
      if (Number.isNaN(at.getTime())) return null;
      const when = at.toLocaleString(tag, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC",
      });
      return { icon: Hourglass, tone: "primary", text: rich(k.nextKvk, { date: <Strong>{`${when} UTC`}</Strong> }), href: "/" };
    }
    case "hall_of_fame": {
      const picks = (Array.isArray(d.names) ? d.names : []) as { name?: unknown; alliance?: unknown }[];
      if (!picks.length) return null;
      const order = (a: unknown) => {
        const i = ALLIANCE_TAGS.indexOf(str(a));
        return i === -1 ? ALLIANCE_TAGS.length : i;
      };
      const sorted = [...picks].sort((a, b) => order(a.alliance) - order(b.alliance));
      const shown = sorted.slice(0, NAMES_SHOWN).map((p) => nameWithTag(str(p.name), str(p.alliance)));
      const rest = sorted.length - shown.length;
      const list = new Intl.ListFormat(tag, { type: "conjunction" }).format(
        rest > 0 ? [...shown, fmt(t.notifications.more, { n: rest })] : shown,
      );
      return {
        icon: Trophy,
        tone: "gold",
        text: rich(k.hallOfFame, { date: day(str(d.week)), names: <Strong>{list}</Strong> }),
        href: "/#hall-of-fame",
      };
    }
    case "hall_of_fame_you":
      return { icon: Award, tone: "gold", text: rich(k.hallOfFameYou, { date: <Strong>{day(str(d.week))}</Strong> }), href: "/#hall-of-fame" };
    case "king":
      return {
        icon: Crown,
        tone: "gold",
        text: rich(k.king, { name: <Strong>{nameWithTag(str(d.name), str(d.alliance))}</Strong> }),
        href: "/",
      };
    case "alliance_events":
      return { icon: Swords, tone: "primary", text: rich(k.allianceEvents, { alliance: <Strong>{str(d.alliance)}</Strong> }), href: "/#events" };
    case "signup": {
      const name = <Strong>{nameWithTag(str(d.name), str(d.alliance))}</Strong>;
      return d.transfer
        ? {
            icon: UserPlus,
            tone: "primary",
            text: rich(k.signupTransfer, { name, kingdom: fmt(t.common.kingdomName, { n: num(d.from_kingdom) }) }),
            href: "/admin/accounts?status=transfers",
          }
        : { icon: UserPlus, tone: "primary", text: rich(k.signup, { name }), href: "/admin/accounts?status=pending" };
    }
    default:
      return null;
  }
}

/** "just now", "5 min ago", "yesterday", then a short date. */
export function timeAgo(iso: string, now: number, t: Messages, locale: Locale) {
  const tag = LOCALE_INFO[locale].tag;
  const seconds = Math.round((now - Date.parse(iso)) / 1000);
  if (seconds < 60) return t.notifications.justNow;
  const rtf = new Intl.RelativeTimeFormat(tag, { numeric: "auto", style: "short" });
  if (seconds < 3600) return rtf.format(-Math.floor(seconds / 60), "minute");
  if (seconds < 86_400) return rtf.format(-Math.floor(seconds / 3600), "hour");
  if (seconds < 7 * 86_400) return rtf.format(-Math.floor(seconds / 86_400), "day");
  return new Date(iso).toLocaleDateString(tag, { day: "numeric", month: "short" });
}

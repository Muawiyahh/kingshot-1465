import {
  ArrowLeftRight,
  CalendarClock,
  CalendarRange,
  Castle,
  CircleUserRound,
  Crown,
  LayoutDashboard,
  MessageSquareShare,
  MessagesSquare,
  Server,
  Swords,
  Trophy,
  UserCheck,
  UserRoundPen,
} from "lucide-react";

/**
 * Icon for each section of the admin and account areas. Kept out of the client menu file so
 * server pages can import it too.
 */
export const SECTION_ICONS = {
  overview: LayoutDashboard,
  events: CalendarRange,
  nextKvk: CalendarClock,
  accounts: UserCheck,
  transferMessages: MessageSquareShare,
  king: Crown,
  server: Server,
  allianceEvents: Swords,
  hallOfFame: Trophy,
  transfers: ArrowLeftRight,
  appointments: Castle,
  messages: MessagesSquare,
  profile: UserRoundPen,
  accountOverview: CircleUserRound,
} as const;

export type SectionKey = keyof typeof SECTION_ICONS;

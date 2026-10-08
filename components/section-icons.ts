import {
  CalendarRange,
  Castle,
  Crown,
  LayoutDashboard,
  MessagesSquare,
  Server,
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
  accounts: UserCheck,
  king: Crown,
  server: Server,
  appointments: Castle,
  messages: MessagesSquare,
  profile: UserRoundPen,
} as const;

export type SectionKey = keyof typeof SECTION_ICONS;

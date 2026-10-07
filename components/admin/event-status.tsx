import { Badge } from "@/components/ui";
import type { Messages } from "@/lib/i18n/messages/en";
import type { EventStatus } from "@/lib/types";

const tones: Record<EventStatus, "neutral" | "gold" | "red" | "green" | "amber"> = {
  draft: "neutral",
  open: "amber",
  closed: "gold",
  published: "green",
};

export function EventStatusBadge({ status, t }: { status: EventStatus; t: Messages }) {
  return <Badge tone={tones[status]}>{t.status.event[status]}</Badge>;
}

import { Badge } from "@/components/ui";
import type { EventStatus } from "@/lib/types";

const map: Record<EventStatus, { label: string; tone: "neutral" | "gold" | "red" | "green" | "amber" }> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Applications open", tone: "amber" },
  closed: { label: "Applications closed", tone: "gold" },
  published: { label: "Published", tone: "green" },
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const s = map[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

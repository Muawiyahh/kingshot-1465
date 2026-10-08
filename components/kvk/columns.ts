import type { GridColumn } from "@/components/kvk/kvk-grid";
import { sortDays } from "@/lib/kvk";

/** Grid columns from event days (day/position rows), in schedule order. */
export function toColumns(days: { id: string; day_number: number; date: string; position: string }[]): GridColumn[] {
  return sortDays(days).map((d) => ({ id: d.id, dayNumber: d.day_number, date: d.date, position: d.position }));
}

/** The slot length shared by an event's days (every day of an event is created with the same one). */
export function eventSlotMinutes(days: { slot_minutes: number }[]) {
  return days[0]?.slot_minutes ?? 30;
}

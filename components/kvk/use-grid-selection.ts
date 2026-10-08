"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Which column (?day=) and slot (?slot=) the drawer shows, kept in the URL. That way the phone's
 * back button closes the drawer, links like /admin/days/X can open it, and coming back to a page
 * doesn't resurrect a stale drawer. Uses the native History API, which Next keeps in sync with
 * useSearchParams, so opening and switching never waits for the server.
 *
 * Reads search params, so callers must render inside a <Suspense> boundary.
 */
export function useGridSelection() {
  const params = useSearchParams();
  const day = params.get("day");
  const rawSlot = params.get("slot");
  const slot = rawSlot !== null && /^\d+$/.test(rawSlot) ? Number(rawSlot) : null;
  // Whether this page pushed the history entry that opened the drawer (so closing can go back).
  const pushed = useRef(false);

  function write(next: { day: string | null; slot: number | null }, mode: "push" | "replace") {
    const url = new URL(window.location.href);
    if (next.day) url.searchParams.set("day", next.day);
    else url.searchParams.delete("day");
    if (next.day && next.slot !== null) url.searchParams.set("slot", String(next.slot));
    else url.searchParams.delete("slot");
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }

  function open(nextDay: string, nextSlot: number | null = null) {
    if (day === null) {
      pushed.current = true;
      write({ day: nextDay, slot: nextSlot }, "push");
    } else {
      write({ day: nextDay, slot: nextSlot }, "replace");
    }
  }

  function close() {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    } else {
      write({ day: null, slot: null }, "replace");
    }
  }

  return { day, slot, open, close };
}

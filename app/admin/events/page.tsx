import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { EventStatusBadge } from "@/components/admin/event-status";
import { requireLeader } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KvkEvent } from "@/lib/types";
import { CreateEventForm } from "./create-event-form";

export const metadata: Metadata = { title: "KvK events · Admin" };

export default function EventsPage() {
  return (
    <>
      <PageHeader title="KvK events">
        Create an event, open it for applications, review and assign slots, then publish it to the positions page.
      </PageHeader>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
        <EventsContent />
      </Suspense>
    </>
  );
}

async function EventsContent() {
  await requireLeader();
  const supabase = await createClient();
  const { data } = await supabase.from("kvk_events").select("*").order("starts_on", { ascending: false });
  const events = (data ?? []) as KvkEvent[];

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
      <section aria-labelledby="all-events">
        <h2 id="all-events" className="mb-4 font-display text-lg font-semibold">
          All events
        </h2>
        {events.length === 0 ? (
          <Card className="p-8 text-center text-muted">No events yet.</Card>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/events/${e.id}`} className="group block rounded-3xl">
                  <Card className="flex items-center gap-4 p-5 transition-colors group-hover:bg-card-hover">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{e.title}</p>
                      <p className="text-sm text-muted">Day 1: {e.starts_on}</p>
                    </div>
                    <EventStatusBadge status={e.status} />
                    <ArrowRight className="size-4 text-muted" aria-hidden />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="new-event">
        <h2 id="new-event" className="mb-4 font-display text-lg font-semibold">
          New event
        </h2>
        <Card className="p-6">
          <CreateEventForm />
        </Card>
      </section>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SECTION_ICONS, type SectionKey } from "@/components/section-icons";
import { Card } from "@/components/ui";

export type SectionCard = {
  key: SectionKey;
  /** Already localised. */
  href: string;
  label: string;
  description: string;
  /** Small gold heading above the label, e.g. the menu group. */
  group?: string | null;
  /** What the section holds right now, e.g. "jess [GBC]". */
  current?: string;
};

/**
 * One card per section of an area ("Where to find things"). The cards are static, so they render
 * instantly; the `current` chips can be filled in once data arrives.
 */
export function SectionCards({ cards }: { cards: SectionCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => {
        const Icon = SECTION_ICONS[card.key];
        return (
          <Link key={card.key} href={card.href} className="group rounded-3xl">
            <Card className="flex h-full items-start gap-4 p-5 transition-colors group-hover:bg-card-hover">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(214,58,68,0.3)]">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                {card.group && (
                  <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold">{card.group}</span>
                )}
                <span className={card.group ? "mt-1 block font-medium" : "block font-medium"}>{card.label}</span>
                <span className="mt-1 block text-sm text-muted">{card.description}</span>
                {card.current && (
                  <span className="mt-3 inline-block max-w-full truncate rounded-full bg-white/5 px-2.5 py-1 font-mono text-xs text-fg">
                    {card.current}
                  </span>
                )}
              </span>
              <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

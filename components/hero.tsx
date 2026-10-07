"use client";

import { MotionConfig, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { site } from "@/lib/site";
import { Crest } from "@/components/crest";
import { useI18n } from "@/components/i18n-provider";
import { fmt } from "@/lib/i18n/format";

// Deterministic ember field (no Math.random, so server and client markup match).
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + ((i * 7) % 4),
  duration: 9 + ((i * 13) % 10),
  delay: -((i * 11) % 18),
  drift: ((i * 29) % 40) - 20,
}));

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero({
  actions,
  visual,
}: {
  actions: ReactNode;
  /** Right-hand column (below the text on mobile). */
  visual: ReactNode;
}) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const numeralX = useTransform(sx, (v) => v * -14);
  const numeralY = useTransform(sy, (v) => v * -10);
  const visualX = useTransform(sx, (v) => v * 16);
  const visualY = useTransform(sy, (v) => v * 10);

  function onMove(e: React.PointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }

  return (
    <MotionConfig reducedMotion="user">
    <section
      onPointerMove={onMove}
      className="grain relative isolate flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden"
      aria-labelledby="hero-title"
    >
      {/* Ambient light */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="ember-blob absolute -top-1/4 left-1/2 h-[70vh] w-[70vw] -translate-x-1/2 rounded-full bg-primary/25 blur-[140px]" />
        <div className="ember-blob absolute bottom-[-20%] right-[-10%] h-[50vh] w-[45vw] rounded-full bg-gold/15 blur-[120px] [animation-delay:-6s]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--bg)_80%)]" />
      </div>

      {/* Embers */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="ember absolute bottom-[-2rem] rounded-full bg-[#ffb36b] shadow-[0_0_10px_2px_rgba(255,120,60,0.6)]"
            style={{
              left: `${e.left}%`,
              width: e.size,
              height: e.size,
              animationDuration: `${e.duration}s`,
              animationDelay: `${e.delay}s`,
              translate: `${e.drift}px 0`,
            }}
          />
        ))}
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 text-xs text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] backdrop-blur"
          >
            <Crest className="size-4" />
            {t.home.badge}
          </motion.div>

          <h1 id="hero-title" className="sr-only">
            {fmt(t.common.kingdomName, { n: site.kingdom })}
          </h1>
          <motion.div aria-hidden style={{ x: numeralX, y: numeralY }}>
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease, delay: 0.1 }}
              className="numeral select-none text-[clamp(5.5rem,24vw,14rem)] leading-[0.85] font-black tracking-tight"
            >
              {site.kingdom}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.35 }}
          >
            <p className="mt-4 font-display text-xl tracking-wide text-gold-soft sm:text-2xl">{t.home.motto}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{t.home.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>
          </motion.div>
        </div>

        <motion.div style={{ x: visualX, y: visualY }} className="relative">
          {visual}
        </motion.div>
      </div>
    </section>
    </MotionConfig>
  );
}

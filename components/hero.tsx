"use client";

import Image from "next/image";
import { MotionConfig, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { site } from "@/lib/site";
import { Crest } from "@/components/crest";

// Deterministic ember field (no Math.random, so server and client markup match).
const EMBERS = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 2 + ((i * 7) % 4),
  duration: 9 + ((i * 13) % 10),
  delay: -((i * 11) % 18),
  drift: ((i * 29) % 40) - 20,
}));

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero({ countdown, actions }: { countdown: ReactNode; actions: ReactNode }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const numeralX = useTransform(sx, (v) => v * -14);
  const numeralY = useTransform(sy, (v) => v * -10);
  const portraitX = useTransform(sx, (v) => v * 18);
  const portraitY = useTransform(sy, (v) => v * 12);

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

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-10 pb-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:px-8">
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 text-xs text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] backdrop-blur"
          >
            <Crest className="size-4" />
            Kingshot · Official community portal
          </motion.div>

          <h1 id="hero-title" className="sr-only">
            {site.name}
          </h1>
          <motion.div aria-hidden style={{ x: numeralX, y: numeralY }}>
            <motion.p
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.1, ease, delay: 0.1 }}
              className="numeral select-none text-[clamp(5.5rem,24vw,15rem)] leading-[0.85] font-black tracking-tight"
            >
              {site.kingdom}
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease, delay: 0.35 }}
          >
            <p className="mt-4 font-display text-xl tracking-wide text-gold-soft sm:text-2xl">{site.motto}</p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{site.intro}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>
            <div className="mt-8">{countdown}</div>
          </motion.div>
        </div>

        <motion.div
          style={{ x: portraitX, y: portraitY }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease, delay: 0.2 }}
          className="relative mx-auto w-full max-w-[18rem] sm:max-w-[22rem] lg:max-w-[30rem]"
        >
          <Portrait />
        </motion.div>
      </div>
    </section>
    </MotionConfig>
  );
}

function Portrait() {
  return (
    <div className="relative aspect-[4/5]">
      {/* Halo */}
      <div aria-hidden className="absolute inset-[8%] rounded-full bg-primary/30 blur-3xl" />
      <div
        aria-hidden
        className="absolute inset-[4%] rounded-full shadow-[inset_0_0_0_1px_rgba(241,208,138,0.25)]"
      />
      <div
        aria-hidden
        className="absolute inset-[12%] rounded-full shadow-[inset_0_0_0_1px_rgba(241,208,138,0.12)]"
      />
      {site.heroImage ? (
        <Image
          src={site.heroImage}
          alt="Amadeus"
          fill
          priority
          sizes="(min-width: 1024px) 30rem, 22rem"
          className="object-contain object-bottom drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)]"
        />
      ) : (
        <PortraitPlaceholder />
      )}
    </div>
  );
}

/** Stylised knight silhouette shown until the Amadeus artwork is added to /public. */
function PortraitPlaceholder() {
  return (
    <svg viewBox="0 0 400 500" className="relative h-full w-full" role="img" aria-label="Amadeus portrait placeholder">
      <defs>
        <linearGradient id="armor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a2a2d" />
          <stop offset="1" stopColor="#140f11" />
        </linearGradient>
        <linearGradient id="trim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d08a" />
          <stop offset="1" stopColor="#a8792a" />
        </linearGradient>
        <linearGradient id="cape" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0404a" />
          <stop offset="1" stopColor="#5a0d13" />
        </linearGradient>
      </defs>
      <path d="M70 500c10-120 50-180 130-200 80 20 120 80 130 200Z" fill="url(#cape)" opacity=".9" />
      <path d="M110 500c8-95 40-150 90-165 50 15 82 70 90 165Z" fill="url(#armor)" stroke="url(#trim)" strokeWidth="2" />
      <path d="M200 70c-52 0-84 40-84 96 0 48 22 86 50 104h68c28-18 50-56 50-104 0-56-32-96-84-96Z" fill="url(#armor)" stroke="url(#trim)" strokeWidth="3" />
      <path d="M140 165h120" stroke="#0d0a0b" strokeWidth="14" strokeLinecap="round" />
      <path d="M140 165h120" stroke="#e0404a" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      <path d="M200 70v200" stroke="url(#trim)" strokeWidth="3" />
      <path d="M200 20c18 22 18 40 0 54-18-14-18-32 0-54Z" fill="url(#cape)" />
      <text x="200" y="430" textAnchor="middle" fill="#f1d08a" fontFamily="var(--font-display)" fontSize="22" letterSpacing="6">
        AMADEUS
      </text>
    </svg>
  );
}

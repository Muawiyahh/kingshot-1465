"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";

/** Number that counts up from 0 on mount. Server HTML already holds the real value. */
export function CountUp({ value, delay = 0 }: { value: number; delay?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("en-US"));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    mv.set(0);
    const controls = animate(mv, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1], delay });
    return () => controls.stop();
  }, [value, delay, reduce, mv]);

  return (
    <>
      <motion.span aria-hidden>{rounded}</motion.span>
      <span className="sr-only">{value.toLocaleString("en-US")}</span>
    </>
  );
}

"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const SIZE = 460; // px

/**
 * Glow de color que sigue el puntero con un lag suave (spring).
 * Se oculta en pantallas táctiles y respeta prefers-reduced-motion.
 */
export function CursorGlow() {
  const x = useMotionValue(-9999);
  const y = useMotionValue(-9999);

  const springX = useSpring(x, { stiffness: 140, damping: 22, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 140, damping: 22, mass: 0.6 });

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    const onMove = (e: PointerEvent) => {
      x.set(e.clientX - SIZE / 2);
      y.set(e.clientY - SIZE / 2);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-20 hidden md:block"
      style={{
        x: springX,
        y: springY,
        width: SIZE,
        height: SIZE,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(29,233,214,0.22) 0%, rgba(226,59,59,0.12) 38%, transparent 68%)",
        filter: "blur(48px)",
        mixBlendMode: "screen",
      }}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const INTERACTIVE_SELECTOR =
  "a, button, input, select, textarea, summary, [role='button']";

export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const [pressed, setPressed] = useState(false);

  const dotWrapRef = useRef<HTMLDivElement>(null);
  const ringWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!finePointer || reducedMotion) return;

    setEnabled(true);

    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dot = { x: mouse.x, y: mouse.y };
    const ring = { x: mouse.x, y: mouse.y };
    let frame = 0;

    function onMove(event: MouseEvent) {
      mouse.x = event.clientX;
      mouse.y = event.clientY;
    }

    function onOver(event: MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) setActive(true);
    }

    function onOut(event: MouseEvent) {
      const target = event.target as Element | null;
      if (target?.closest(INTERACTIVE_SELECTOR)) setActive(false);
    }

    function onDown() {
      setPressed(true);
    }

    function onUp() {
      setPressed(false);
    }

    function tick() {
      dot.x += (mouse.x - dot.x) * 0.7;
      dot.y += (mouse.y - dot.y) * 0.7;
      ring.x += (mouse.x - ring.x) * 0.22;
      ring.y += (mouse.y - ring.y) * 0.22;

      if (dotWrapRef.current) {
        dotWrapRef.current.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
      }
      if (ringWrapRef.current) {
        ringWrapRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%)`;
      }

      frame = requestAnimationFrame(tick);
    }

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999]">
      <div
        className="fixed left-0 top-0 will-change-transform"
        ref={dotWrapRef}
      >
        <div
          className={`size-2 rounded-full bg-white mix-blend-difference transition-[transform,opacity] duration-200 ${
            active ? "opacity-40" : "opacity-100"
          }`}
          style={{ transform: `scale(${active ? 0.4 : 1})` }}
        />
      </div>
      <div
        className="fixed left-0 top-0 will-change-transform"
        ref={ringWrapRef}
      >
        <div
          className="size-9 rounded-full border-[1.5px] border-white mix-blend-difference transition-transform duration-200"
          style={{ transform: `scale(${(active ? 1.6 : 1) * (pressed ? 0.8 : 1)})` }}
        />
      </div>
    </div>
  );
}

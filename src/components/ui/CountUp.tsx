"use client";
import { useEffect, useRef, useState } from "react";

export function CountUp({ value, formatter }: { value: number; formatter?: (n: number) => React.ReactNode }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    const duration = 650;
    let start: number | null = null;
    let raf: number;
    function step(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(step);
      else {
        setDisplay(to);
        prevRef.current = to;
      }
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{formatter ? formatter(display) : Math.round(display)}</>;
}

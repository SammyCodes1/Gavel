"use client";

import { useEffect, useState } from "react";

/** Current time in seconds, updated every second. Returns 0 until mounted (avoids hydration mismatch). */
export function useNow(): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Math.floor(Date.now() / 1000));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

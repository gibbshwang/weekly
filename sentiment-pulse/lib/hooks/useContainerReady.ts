"use client";

import { useRef, useState, useEffect, type RefObject } from "react";

/**
 * Returns a ref and a boolean indicating whether the container
 * has been laid out with a positive width. Prevents Recharts
 * ResponsiveContainer from measuring before layout is complete.
 */
export function useContainerReady(): [RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (el.offsetWidth > 0) {
      setReady(true);
      return;
    }

    const observer = new ResizeObserver((entries) => {
      if (entries[0]?.contentRect.width > 0) {
        setReady(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, ready];
}

"use client";

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from "react";

export function AutoFitText({
  as: Tag = "div",
  className,
  children,
  max,
  min,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  max: number;
  min: number;
}) {
  const ref = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fit = () => {
      let size = max;
      el.style.fontSize = `${size}px`;
      const limit = Math.max(0, el.clientHeight);
      while (size > min && el.scrollHeight > limit) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children, max, min]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}

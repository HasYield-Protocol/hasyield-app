"use client";

import { useRef, useState } from "react";

type Props = { children: React.ReactNode; className?: string };

export function GlareHover({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: -200, y: -200 });
  const [visible, setVisible] = useState(false);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-200"
        style={{
          opacity: visible ? 1 : 0,
          background: `radial-gradient(180px circle at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.35), transparent 60%)`,
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}

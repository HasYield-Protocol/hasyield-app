"use client";

type Props = { children: React.ReactNode; className?: string; speed?: number };

export function ShinyText({ children, className = "", speed = 4 }: Props) {
  return (
    <span
      className={`inline-block ${className}`}
      style={{
        backgroundImage:
          "linear-gradient(110deg, #DEDBC8 0%, #DEDBC8 40%, #ffffff 50%, #DEDBC8 60%, #DEDBC8 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        animation: `shiny-sweep ${speed}s linear infinite`,
      }}
    >
      {children}
    </span>
  );
}

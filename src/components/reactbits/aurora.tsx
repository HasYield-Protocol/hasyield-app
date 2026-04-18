"use client";

export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[120vw] h-[80vh] rounded-full opacity-[0.18]"
        style={{
          background:
            "radial-gradient(ellipse at center, #DEDBC8 0%, rgba(222,219,200,0.3) 25%, transparent 60%)",
          filter: "blur(80px)",
          animation: "aurora-drift 14s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/4 -left-1/4 w-[60vw] h-[60vh] rounded-full opacity-[0.10]"
        style={{
          background:
            "radial-gradient(circle at center, #DEDBC8 0%, transparent 65%)",
          filter: "blur(100px)",
          animation: "aurora-drift-2 18s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[50vw] h-[50vh] rounded-full opacity-[0.08]"
        style={{
          background:
            "radial-gradient(circle at center, #DEDBC8 0%, transparent 70%)",
          filter: "blur(120px)",
          animation: "aurora-drift 22s ease-in-out infinite reverse",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, #000 85%)",
        }}
      />
    </div>
  );
}

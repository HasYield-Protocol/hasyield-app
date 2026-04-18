"use client";

import { motion } from "motion/react";

type Props = { src?: string; size?: number; thickness?: number };

export function Coin3D({ src = "/logo.png", size = 192, thickness = 22 }: Props) {
  const edges = Array.from({ length: thickness }, (_, i) => i);

  return (
    <div
      className="relative"
      style={{ width: size, height: size, perspective: 1200 }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(222,219,200,0.25), rgba(222,219,200,0) 60%)",
          filter: "blur(30px)",
          transform: "translateZ(-40px)",
        }}
      />
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      >
        {edges.map((i) => {
          const z = i - thickness / 2;
          const shade = 1 - Math.abs(z) / (thickness / 2);
          return (
            <div
              key={i}
              className="absolute inset-0 rounded-full"
              style={{
                transform: `translateZ(${z}px)`,
                background: `radial-gradient(circle at 50% 50%, rgba(${40 + shade * 35},${40 + shade * 34},${36 + shade * 32},1) 0%, rgba(${18 + shade * 20},${18 + shade * 20},${16 + shade * 18},1) 70%, #0a0a0a 100%)`,
                boxShadow:
                  i === 0 || i === thickness - 1
                    ? "inset 0 0 0 1px rgba(222,219,200,0.15)"
                    : "none",
              }}
            />
          );
        })}

        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            transform: `translateZ(${thickness / 2}px)`,
            boxShadow:
              "inset 0 0 0 2px rgba(222,219,200,0.35), 0 0 60px rgba(222,219,200,0.2)",
          }}
        >
          <img
            src={src}
            alt="coin"
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.25) 100%)",
              mixBlendMode: "overlay",
            }}
          />
        </div>

        <div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            transform: `translateZ(-${thickness / 2}px) rotateY(180deg)`,
            boxShadow:
              "inset 0 0 0 2px rgba(222,219,200,0.35), 0 0 60px rgba(222,219,200,0.2)",
          }}
        >
          <img
            src={src}
            alt="coin-back"
            className="w-full h-full object-cover"
            draggable={false}
            style={{ transform: "scaleX(-1)" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,0.3) 100%)",
              mixBlendMode: "overlay",
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}

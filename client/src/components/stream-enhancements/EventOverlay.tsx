import { useEffect, useState } from "react";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";

interface EventOverlayProps {
  current?: ComprehensiveSpaceWeatherData;
  previous?: ComprehensiveSpaceWeatherData;
}

interface Flash {
  title: string;
  desc: string;
  tone: "storm" | "surge" | "aurora" | "calm";
}

const formatNum = (n: number, digits = 1) => Number.isFinite(n) ? n.toFixed(digits) : "—";

export function EventOverlay({ current, previous }: EventOverlayProps) {
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    if (!current) return;

    const kp = current.k_index?.kp ?? 0;
    const prevKp = previous?.k_index?.kp ?? 0;
    const vel = current.solar_wind?.velocity ?? 0;
    const prevVel = previous?.solar_wind?.velocity ?? vel;
    const density = current.solar_wind?.density ?? 0;
    const prevDensity = previous?.solar_wind?.density ?? density;
    const bz = current.solar_wind?.bz ?? 0;

    const deltaVel = vel - prevVel;
    const deltaDensity = density - prevDensity;

    let next: Flash | null = null;

    // Thresholds
    if (kp >= 6 && prevKp < 6) {
      next = {
        title: "Geomagnetic Storm",
        desc: `Kp ${formatNum(kp)} — Aurora Watch`,
        tone: "aurora",
      };
    } else if (kp >= 4 && prevKp < 4) {
       next = {
        title: "Activity Rising",
        desc: `Kp ${formatNum(kp)} — Active Conditions`,
        tone: "storm",
      };
    } else if (vel > 600 && deltaVel > 50) {
      next = {
        title: "Wind Surge",
        desc: `${formatNum(vel, 0)} km/s (+${formatNum(deltaVel, 0)})`,
        tone: "surge",
      };
    } else if (bz < -10) {
      next = {
        title: "Southward IMF",
        desc: `Bz ${formatNum(bz)} nT — Crack in the Shield`,
        tone: "storm",
      };
    } else if (deltaDensity > 5 && density > 15) {
      next = {
        title: "Density Spike",
        desc: `${formatNum(density, 1)} p/cm³ Impact`,
        tone: "surge",
      };
    }

    if (next) {
      setFlash(next);
      const t = setTimeout(() => setFlash(null), 8000);
      return () => clearTimeout(t);
    }
  }, [current, previous]);

  if (!flash) return null;

  const borderClass =
    flash.tone === "aurora"
      ? "border-emerald-500 text-emerald-500"
      : flash.tone === "storm"
        ? "border-red-500 text-red-500"
        : flash.tone === "surge"
          ? "border-amber-500 text-amber-500"
          : "border-white text-white";

  return (
    <div className="pointer-events-none absolute top-8 right-8 z-50 max-w-md w-full perspective-1000">
      <div
        className={`
          relative overflow-hidden bg-black 
          border-y-4 border-r-4 border-l-[12px] ${borderClass}
          shadow-[12px_12px_0px_0px_rgba(0,0,0,0.8)] 
          p-6 flex flex-col gap-2
          -skew-x-6
          animate-in slide-in-from-right-full fade-in duration-500 timing-function-out-expo
        `}
      >
        {/* Diagonal Striped Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,currentColor_10px,currentColor_12px)]" />
        
        <div className="relative z-10 flex items-center justify-between border-b-4 border-current pb-2 mb-2 skew-x-6">
           <span className="text-sm font-black uppercase tracking-[0.2em] bg-current text-black px-2 py-0.5">
             Alert System
           </span>
           <div className="flex gap-1">
             {[1,2,3].map(i => <div key={i} className="w-3 h-3 bg-current animate-pulse" style={{animationDelay: `${i*100}ms`}} />)}
           </div>
        </div>
        
        <div className="relative z-10 skew-x-6">
          <h2 className="text-4xl font-black uppercase tracking-tighter leading-[0.85] mb-2 text-white drop-shadow-md">
            {flash.title}
          </h2>
          <p className="text-xl font-bold font-mono uppercase tracking-tight bg-white text-black inline-block px-2 py-1">
            {flash.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
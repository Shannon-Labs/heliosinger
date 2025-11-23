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
    <div className="pointer-events-none absolute top-6 right-6 z-50 max-w-md w-full">
      <div
        className={`
          relative overflow-hidden bg-black border-4 ${borderClass} 
          shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] 
          p-6 flex flex-col gap-2
          animate-in slide-in-from-right-10 fade-in duration-500
        `}
      >
        {/* Scanlines effect overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%] opacity-20" />
        
        <div className="relative z-10 flex items-center justify-between border-b-2 border-current pb-2 mb-1">
           <span className="text-xs font-mono uppercase tracking-[0.2em] font-bold">
             Alert System // Broadcast
           </span>
           <div className="w-2 h-2 bg-current animate-pulse" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">
            {flash.title}
          </h2>
          <p className="text-lg font-mono font-medium opacity-90 uppercase tracking-tight">
            {flash.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
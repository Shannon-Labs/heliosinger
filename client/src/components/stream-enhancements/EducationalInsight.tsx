import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  EducationalInsight as InsightType,
  InsightTrack,
  InsightPriority,
  NarratorState,
} from "@/lib/educational-narrator";
import { getCurrentInsight, getInsightProgress } from "@/lib/educational-narrator";

interface EducationalInsightProps {
  narratorState: NarratorState;
}

const TRACK_CONFIG: Record<InsightTrack, { label: string; color: string; bgColor: string; icon: string }> = {
  "space-weather": {
    label: "SPACE WEATHER",
    color: "text-amber-400",
    bgColor: "bg-amber-400",
    icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707",
  },
  acoustics: {
    label: "ACOUSTICS",
    color: "text-emerald-400",
    bgColor: "bg-emerald-400",
    icon: "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3",
  },
  electromagnetism: {
    label: "ELECTROMAGNETISM",
    color: "text-violet-400",
    bgColor: "bg-violet-400",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
};

const PRIORITY_CONFIG: Record<InsightPriority, { scale: number; glow: boolean }> = {
  breakthrough: { scale: 1.02, glow: true },
  significant: { scale: 1.01, glow: true },
  notable: { scale: 1, glow: false },
  ambient: { scale: 0.98, glow: false },
};

export function EducationalInsight({ narratorState }: EducationalInsightProps) {
  const [progress, setProgress] = useState(0);

  // Update progress smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(getInsightProgress(narratorState));
    }, 50);
    return () => clearInterval(interval);
  }, [narratorState]);

  const insight = getCurrentInsight(narratorState);
  const trackConfig = insight ? TRACK_CONFIG[insight.track] : null;
  const priorityConfig = insight ? PRIORITY_CONFIG[insight.priority] : null;

  return (
    <AnimatePresence mode="wait">
      {insight && trackConfig && priorityConfig && (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, x: -40, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: priorityConfig.scale }}
          exit={{ opacity: 0, x: 40, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="pointer-events-none absolute bottom-3 left-3 right-3 sm:bottom-8 sm:left-8 sm:right-8 z-40 max-w-2xl"
        >
          <div
            className={`
              relative overflow-hidden bg-black/95 backdrop-blur-sm
              border-l-8 ${trackConfig.color.replace("text-", "border-")}
              border-y-2 border-r-2 border-white/20
              shadow-[8px_8px_0px_rgba(0,0,0,0.8)]
              ${priorityConfig.glow ? "ring-1 ring-white/20" : ""}
            `}
          >
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
              <motion.div
                className={`h-full ${trackConfig.bgColor}`}
                initial={{ width: "0%" }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>

            {/* Track label */}
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 pt-3 sm:pt-5 pb-1 sm:pb-2">
              <div className={`w-5 h-5 ${trackConfig.color}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={trackConfig.icon} />
                </svg>
              </div>
              <span className={`text-[10px] font-black tracking-[0.3em] uppercase ${trackConfig.color}`}>
                {trackConfig.label}
              </span>
              {insight.priority === "breakthrough" && (
                <span className="text-[9px] font-black tracking-widest uppercase bg-white text-black px-2 py-0.5 animate-pulse">
                  BREAKTHROUGH
                </span>
              )}
            </div>

            {/* Headline */}
            <div className="px-3 sm:px-6 pb-1 sm:pb-2">
              <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white uppercase tracking-tight leading-none">
                {insight.headline}
              </h2>
            </div>

            {/* Explanation */}
            <div className="px-3 sm:px-6 pb-2 sm:pb-3">
              <p className="text-xs sm:text-sm md:text-base text-white/90 leading-relaxed">
                {insight.explanation}
              </p>
            </div>

            {/* Data Connection */}
            <div className="px-3 sm:px-6 pb-2 sm:pb-3 flex flex-wrap gap-2 sm:gap-3">
              <div className="bg-white/10 border border-white/20 px-3 py-1.5 -skew-x-6">
                <p className="text-xs font-mono text-white/80 skew-x-6">
                  <span className="text-primary font-bold">DATA:</span> {insight.dataConnection}
                </p>
              </div>
            </div>

            {/* Sound Connection (if present) */}
            {insight.soundConnection && (
              <div className="px-3 sm:px-6 pb-3 sm:pb-5">
                <div className={`border-l-4 ${trackConfig.color.replace("text-", "border-")} pl-4 py-2 bg-white/5`}>
                  <p className="text-xs uppercase tracking-wider text-white/50 mb-1 font-bold">
                    What You Hear
                  </p>
                  <p className="text-sm text-white/90 italic">
                    "{insight.soundConnection}"
                  </p>
                </div>
              </div>
            )}

            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/10" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/10" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact version for tighter layouts
 */
export function EducationalInsightCompact({ narratorState }: EducationalInsightProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(getInsightProgress(narratorState));
    }, 50);
    return () => clearInterval(interval);
  }, [narratorState]);

  const insight = getCurrentInsight(narratorState);
  const trackConfig = insight ? TRACK_CONFIG[insight.track] : null;

  return (
    <AnimatePresence mode="wait">
      {insight && trackConfig && (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="pointer-events-none"
        >
          <div className={`
            relative bg-black/90 border-l-4 ${trackConfig.color.replace("text-", "border-")}
            border-y border-r border-white/10 px-4 py-3
          `}>
            {/* Progress */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
              <div
                className={`h-full ${trackConfig.bgColor} transition-all duration-100`}
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div className="flex items-start gap-3">
              <div className={`w-4 h-4 mt-0.5 flex-shrink-0 ${trackConfig.color}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={trackConfig.icon} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[9px] font-black tracking-[0.2em] uppercase ${trackConfig.color} mb-1`}>
                  {trackConfig.label}
                </p>
                <p className="text-sm font-bold text-white leading-snug">
                  {insight.headline}
                </p>
                <p className="text-xs text-white/70 mt-1 line-clamp-2">
                  {insight.explanation}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

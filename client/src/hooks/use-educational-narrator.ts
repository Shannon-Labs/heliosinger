import { useEffect, useRef, useState, useCallback } from "react";
import {
  createNarratorState,
  updateNarrator,
  getCurrentInsight,
  type NarratorState,
  type EducationalInsight,
} from "@/lib/educational-narrator";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";
import type { HeliosingerData } from "@/lib/heliosinger-mapping";

interface UseEducationalNarratorOptions {
  /** Current space weather data */
  currentData?: ComprehensiveSpaceWeatherData;
  /** Previous space weather data for comparison */
  previousData?: ComprehensiveSpaceWeatherData;
  /** Current Heliosinger audio synthesis data */
  heliosingerData?: HeliosingerData | null;
  /** Whether the narrator is active */
  enabled?: boolean;
}

interface UseEducationalNarratorReturn {
  /** Current narrator state */
  state: NarratorState;
  /** Current insight being displayed (if any) */
  currentInsight: EducationalInsight | null;
  /** Whether an insight is currently showing */
  isShowingInsight: boolean;
  /** Number of insights queued */
  queueLength: number;
}

/**
 * Hook for managing the Educational Narrator system
 *
 * Analyzes space weather data and heliosinger parameters to generate
 * contextually relevant educational insights.
 */
export function useEducationalNarrator(
  options: UseEducationalNarratorOptions
): UseEducationalNarratorReturn {
  const {
    currentData,
    previousData,
    heliosingerData,
    enabled = true,
  } = options;

  const [state, setState] = useState<NarratorState>(createNarratorState);
  const previousDataRef = useRef<ComprehensiveSpaceWeatherData | undefined>(previousData);

  // Update narrator when data changes
  useEffect(() => {
    if (!enabled) return;

    const newState = updateNarrator(
      currentData,
      previousDataRef.current,
      heliosingerData ?? null,
      state
    );

    setState(newState);
    previousDataRef.current = currentData;
  }, [currentData, heliosingerData, enabled]);

  // Periodic update to handle insight timeouts
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      setState(prev => {
        // Check if current insight has expired
        const insight = getCurrentInsight(prev);
        if (prev.currentInsight && !insight) {
          // Insight expired, trigger state update to potentially show next
          return updateNarrator(currentData, previousDataRef.current, heliosingerData ?? null, prev);
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentData, heliosingerData, enabled]);

  const currentInsight = getCurrentInsight(state);

  return {
    state,
    currentInsight,
    isShowingInsight: !!currentInsight,
    queueLength: state.queue.length,
  };
}

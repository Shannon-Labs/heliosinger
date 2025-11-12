/**
 * Adaptive API Refetch Interval Calculation
 * 
 * Adjusts API update frequency based on space weather activity:
 * - Faster updates during storms (more engaging)
 * - Slower updates during quiet periods (saves resources)
 */

import type { ComprehensiveSpaceWeatherData } from "@shared/schema";

/**
 * Calculate adaptive refetch interval based on space weather conditions
 * 
 * @param data Current space weather data
 * @param previousData Previous data (for detecting rapid changes)
 * @returns Refetch interval in milliseconds
 */
export function calculateRefetchInterval(
  data: ComprehensiveSpaceWeatherData | undefined,
  previousData?: ComprehensiveSpaceWeatherData
): number {
  // Base interval: 60 seconds
  const BASE_INTERVAL = 60000;
  
  if (!data) {
    return BASE_INTERVAL;
  }
  
  const kp = data.k_index?.kp || 0;
  const velocity = data.solar_wind?.velocity || 0;
  
  // Check for rapid velocity changes
  let velocityChangeBonus = 0;
  if (previousData?.solar_wind?.velocity) {
    const velocityChange = Math.abs(velocity - previousData.solar_wind.velocity);
    if (velocityChange > 50) {
      velocityChangeBonus = 40000; // Reduce interval by 40 seconds
    }
  }
  
  // Determine interval based on Kp index
  let interval: number;
  
  if (kp >= 7) {
    // Extreme conditions: 10 seconds
    interval = 10000;
  } else if (kp >= 5) {
    // Storm conditions: 15 seconds
    interval = 15000;
  } else if (kp <= 2) {
    // Quiet conditions: 120 seconds
    interval = 120000;
  } else {
    // Moderate conditions: base interval
    interval = BASE_INTERVAL;
  }
  
  // Apply velocity change bonus (makes it faster if velocity is changing rapidly)
  interval = Math.max(10000, interval - velocityChangeBonus);
  
  return interval;
}

/**
 * Get a human-readable description of the current update frequency
 */
export function getUpdateFrequencyDescription(intervalMs: number): string {
  const seconds = Math.round(intervalMs / 1000);
  
  if (seconds < 20) {
    return `Very Fast (${seconds}s)`;
  } else if (seconds < 40) {
    return `Fast (${seconds}s)`;
  } else if (seconds < 80) {
    return `Normal (${seconds}s)`;
  } else {
    return `Slow (${seconds}s)`;
  }
}


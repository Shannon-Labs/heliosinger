import { useEffect, useRef } from 'react';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

export interface SpaceWeatherEvent {
  id: string;
  type: 'cme' | 'condition_change' | 'kp_threshold' | 'velocity_spike' | 'bz_event';
  timestamp: Date;
  description: string;
  details?: {
    previousValue?: number | string;
    currentValue?: number | string;
    condition?: string;
  };
}

const EVENT_STORAGE_KEY = 'heliosinger-event-history';
const MAX_EVENTS = 10;

function getStoredEvents(): SpaceWeatherEvent[] {
  try {
    const stored = localStorage.getItem(EVENT_STORAGE_KEY);
    if (!stored) return [];
    const events = JSON.parse(stored);
    // Convert timestamp strings back to Date objects
    return events.map((e: any) => ({
      ...e,
      timestamp: new Date(e.timestamp),
    }));
  } catch {
    return [];
  }
}

function storeEvents(events: SpaceWeatherEvent[]): void {
  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.warn('Failed to store events:', error);
  }
}

export function useEventHistory(
  currentData: ComprehensiveSpaceWeatherData | undefined,
  previousData: ComprehensiveSpaceWeatherData | undefined
): {
  events: SpaceWeatherEvent[];
  addEvent: (event: Omit<SpaceWeatherEvent, 'id' | 'timestamp'>) => void;
  clearEvents: () => void;
} {
  const eventsRef = useRef<SpaceWeatherEvent[]>(getStoredEvents());
  const previousDataRef = useRef<ComprehensiveSpaceWeatherData | undefined>(previousData);

  useEffect(() => {
    if (!currentData || !previousDataRef.current) {
      previousDataRef.current = currentData;
      return;
    }

    const prev = previousDataRef.current;
    const curr = currentData;
    const newEvents: SpaceWeatherEvent[] = [];

    // Detect CME impact: velocity spike (>150 km/s) + Bz change
    if (prev.solar_wind && curr.solar_wind) {
      const velocityChange = Math.abs(curr.solar_wind.velocity - prev.solar_wind.velocity);
      const bzChange = Math.abs(curr.solar_wind.bz - prev.solar_wind.bz);
      
      if (velocityChange > 150 && bzChange > 5) {
        newEvents.push({
          id: `cme-${Date.now()}`,
          type: 'cme',
          timestamp: new Date(),
          description: 'CME impact detected',
          details: {
            previousValue: `${prev.solar_wind.velocity.toFixed(1)} km/s`,
            currentValue: `${curr.solar_wind.velocity.toFixed(1)} km/s`,
          },
        });
      }
    }

    // Detect condition changes
    if (prev.k_index && curr.k_index) {
      const prevKp = prev.k_index.kp || 0;
      const currKp = curr.k_index.kp || 0;
      
      // Kp threshold crossings
      const thresholds = [3, 5, 7];
      for (const threshold of thresholds) {
        if (prevKp < threshold && currKp >= threshold) {
          newEvents.push({
            id: `kp-${threshold}-${Date.now()}`,
            type: 'kp_threshold',
            timestamp: new Date(),
            description: `Kp index crossed ${threshold}`,
            details: {
              previousValue: prevKp.toFixed(1),
              currentValue: currKp.toFixed(1),
            },
          });
        }
      }
    }

    // Detect large velocity changes
    if (prev.solar_wind && curr.solar_wind) {
      const velocityChange = Math.abs(curr.solar_wind.velocity - prev.solar_wind.velocity);
      if (velocityChange > 100) {
        newEvents.push({
          id: `velocity-${Date.now()}`,
          type: 'velocity_spike',
          timestamp: new Date(),
          description: 'Large velocity change',
          details: {
            previousValue: `${prev.solar_wind.velocity.toFixed(1)} km/s`,
            currentValue: `${curr.solar_wind.velocity.toFixed(1)} km/s`,
          },
        });
      }
    }

    // Detect strong Bz events
    if (prev.solar_wind && curr.solar_wind && curr.solar_wind.bz < -10) {
      newEvents.push({
        id: `bz-${Date.now()}`,
        type: 'bz_event',
        timestamp: new Date(),
        description: 'Strong southward Bz detected',
        details: {
          currentValue: `${curr.solar_wind.bz.toFixed(1)} nT`,
        },
      });
    }

    // Add new events and store
    if (newEvents.length > 0) {
      eventsRef.current = [...newEvents, ...eventsRef.current].slice(0, MAX_EVENTS);
      storeEvents(eventsRef.current);
    }

    previousDataRef.current = currentData;
  }, [currentData]);

  const addEvent = (event: Omit<SpaceWeatherEvent, 'id' | 'timestamp'>) => {
    const newEvent: SpaceWeatherEvent = {
      ...event,
      id: `${event.type}-${Date.now()}`,
      timestamp: new Date(),
    };
    eventsRef.current = [newEvent, ...eventsRef.current].slice(0, MAX_EVENTS);
    storeEvents(eventsRef.current);
  };

  const clearEvents = () => {
    eventsRef.current = [];
    storeEvents([]);
  };

  return {
    events: eventsRef.current,
    addEvent,
    clearEvents,
  };
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}


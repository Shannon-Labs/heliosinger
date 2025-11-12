import { useEffect, useRef } from 'react';

export interface ChangeInfo {
  field: string;
  previous: any;
  current: any;
  delta?: number;
  timestamp: Date;
}

export function useChangeTracking<T extends Record<string, any>>(
  data: T | undefined,
  enabled: boolean = true
): {
  changes: ChangeInfo[];
  hasChanges: boolean;
  clearChanges: () => void;
} {
  const previousDataRef = useRef<T | undefined>(undefined);
  const changesRef = useRef<ChangeInfo[]>([]);

  useEffect(() => {
    if (!enabled || !data) {
      previousDataRef.current = data;
      return;
    }

    const newChanges: ChangeInfo[] = [];
    const previous = previousDataRef.current;

    if (previous) {
      // Track changes for solar wind fields
      const solarWindFields = ['velocity', 'density', 'bz', 'temperature'];
      
      solarWindFields.forEach((field) => {
        const prevValue = previous.solar_wind?.[field as keyof typeof previous.solar_wind];
        const currValue = data.solar_wind?.[field as keyof typeof data.solar_wind];
        
        if (prevValue !== undefined && currValue !== undefined && prevValue !== currValue) {
          const delta = typeof currValue === 'number' && typeof prevValue === 'number'
            ? currValue - prevValue
            : undefined;
          
          newChanges.push({
            field,
            previous: prevValue,
            current: currValue,
            delta,
            timestamp: new Date(),
          });
        }
      });

      // Track K-index changes
      const prevKp = previous.k_index?.kp;
      const currKp = data.k_index?.kp;
      if (prevKp !== undefined && currKp !== undefined && prevKp !== currKp) {
        newChanges.push({
          field: 'kp',
          previous: prevKp,
          current: currKp,
          delta: currKp - prevKp,
          timestamp: new Date(),
        });
      }
    }

    // Keep only last 5 changes
    changesRef.current = [...newChanges, ...changesRef.current].slice(0, 5);
    previousDataRef.current = data;
  }, [data, enabled]);

  return {
    changes: changesRef.current,
    hasChanges: changesRef.current.length > 0,
    clearChanges: () => {
      changesRef.current = [];
    },
  };
}


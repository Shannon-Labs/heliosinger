import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mapSpaceWeatherToHeliosinger,
  createDefaultHeliosingerMapping,
  createMappingContext,
} from '@/lib/heliosinger-mapping';
import { startSinging, updateSinging, stopSinging, setSingingVolume, ensureAudioUnlocked } from '@/lib/heliosinger-engine';
import { apiRequest } from '@/lib/queryClient';
import { getAmbientSettings } from '@/lib/localStorage';
import { checkAndNotifyEvents, requestNotificationPermission, canSendNotifications } from '@/lib/notifications';
import { debugLog } from '@/lib/debug';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface UseHeliosingerOptions {
  enabled: boolean;
  volume?: number;
  backgroundMode?: boolean;
  comprehensiveData?: ComprehensiveSpaceWeatherData;
  onError?: (error: Error) => void;
}

interface UseHeliosingerReturn {
  isSinging: boolean;
  currentData: ReturnType<typeof mapSpaceWeatherToHeliosinger> | null;
  start: () => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
  backgroundMode: boolean;
  unlock: () => Promise<void>;
}

/**
 * Hook for managing Heliosinger - the sun singing space weather
 * Integrates with React Query for automatic data fetching and audio updates
 */
export function useHeliosinger(options: UseHeliosingerOptions): UseHeliosingerReturn {
  const { enabled, volume = 0.3, backgroundMode: backgroundModeProp = false, comprehensiveData, onError } = options;
  const queryClient = useQueryClient();
  const [isSinging, setIsSinging] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(backgroundModeProp);
  const currentDataRef = useRef<ReturnType<typeof mapSpaceWeatherToHeliosinger> | null>(null);
  const previousDataRef = useRef<ComprehensiveSpaceWeatherData | null>(null);
  const mappingContextRef = useRef(createMappingContext());
  const hasStartedRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const pendingUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request notification permission on first use
  useEffect(() => {
    if (enabled && !canSendNotifications()) {
      requestNotificationPermission().then(permission => {
        if (permission === 'granted') {
          debugLog('🔔 Notification permission granted');
        }
      });
    }
  }, [enabled]);

  // Sync background mode from localStorage
  useEffect(() => {
    const settings = getAmbientSettings();
    if (settings?.background_mode === 'true') {
      setBackgroundMode(true);
    }
  }, []);

  // Handle visibility changes - keep audio running in background mode
  useEffect(() => {
    if (!backgroundMode || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isSinging) {
        debugLog('🌞 Tab hidden - audio continues in background mode');
      } else if (!document.hidden && isSinging) {
        debugLog('🌞 Tab visible - audio continues');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [backgroundMode, enabled, isSinging]);

  // Start singing when enabled and data is available (with hasStartedRef guard)
  useEffect(() => {
    let isMounted = true;

    const startAudio = async () => {
      if (!enabled || !comprehensiveData) return;

      try {
        const heliosingerData = mapSpaceWeatherToHeliosinger(
          comprehensiveData,
          mappingContextRef.current,
          { now: Date.now() }
        );
        currentDataRef.current = heliosingerData;

        await startSinging(heliosingerData);
        if (isMounted) {
          setIsSinging(true);
          hasStartedRef.current = true;
        }

        setSingingVolume(volume);

        debugLog('🌞 Heliosinger started:', {
          note: heliosingerData.baseNote,
          frequency: heliosingerData.frequency.toFixed(1) + ' Hz',
          vowel: heliosingerData.currentVowel.displayName,
          mood: heliosingerData.solarMood,
          harmonics: heliosingerData.harmonicCount,
          condition: heliosingerData.condition,
          kpIndex: heliosingerData.kIndex
        });
      } catch (error) {
        console.error('Failed to start Heliosinger:', error);
        if (isMounted) {
          setIsSinging(false);
          hasStartedRef.current = false;
        }
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to start audio'));
        }
      }
    };

    if (enabled && comprehensiveData && !isSinging && !hasStartedRef.current) {
      startAudio();
    } else if (!enabled && isSinging) {
      stopSinging();
      setIsSinging(false);
      hasStartedRef.current = false;
    }

    return () => {
      isMounted = false;
      if (!enabled && isSinging) {
        stopSinging();
        setIsSinging(false);
        hasStartedRef.current = false;
      }
    };
  }, [enabled, comprehensiveData, isSinging, onError]);

  // Update singing when data changes — throttled to max once per 5 seconds
  useEffect(() => {
    if (!enabled || !comprehensiveData || !isSinging) return;

    const doUpdate = () => {
      try {
        const heliosingerData = mapSpaceWeatherToHeliosinger(
          comprehensiveData,
          mappingContextRef.current,
          { now: Date.now() }
        );
        const previousData = currentDataRef.current;
        const previousComprehensiveData = previousDataRef.current;
        currentDataRef.current = heliosingerData;

        // Check for significant changes and send notifications
        if (previousComprehensiveData && comprehensiveData) {
          const previousKp = previousComprehensiveData.k_index?.kp;
          const currentKp = comprehensiveData.k_index?.kp;
          const previousCondition = previousData?.condition;
          const currentCondition = heliosingerData.condition;
          const previousVelocity = previousComprehensiveData.solar_wind?.velocity;
          const currentVelocity = comprehensiveData.solar_wind?.velocity;
          const previousBz = previousComprehensiveData.solar_wind?.bz;
          const currentBz = comprehensiveData.solar_wind?.bz;

          checkAndNotifyEvents({
            previousKp,
            currentKp,
            previousCondition,
            currentCondition,
            previousVelocity,
            currentVelocity,
            previousBz,
            currentBz,
          });
        }

        // Only log significant changes
        if (!previousData ||
            Math.abs(heliosingerData.frequency - previousData.frequency) > 10 ||
            heliosingerData.condition !== previousData.condition ||
            heliosingerData.vowelName !== previousData.vowelName ||
            heliosingerData.harmonicCount !== previousData.harmonicCount) {
          debugLog('🌞 Heliosinger updated:', {
            note: heliosingerData.baseNote,
            frequency: heliosingerData.frequency.toFixed(1) + ' Hz',
            vowel: heliosingerData.currentVowel.displayName,
            mood: heliosingerData.solarMood,
            harmonics: heliosingerData.harmonicCount,
            condition: heliosingerData.condition,
            kpIndex: heliosingerData.kIndex
          });
        }

        updateSinging(heliosingerData);

        previousDataRef.current = comprehensiveData;
        lastUpdateTimeRef.current = Date.now();
      } catch (error) {
        console.error('Failed to update Heliosinger:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to update audio'));
        }
      }
    };

    const elapsed = Date.now() - lastUpdateTimeRef.current;
    const MIN_UPDATE_INTERVAL = 5000; // 5 seconds

    if (elapsed >= MIN_UPDATE_INTERVAL) {
      doUpdate();
    } else {
      // Schedule a delayed update and return cleanup
      const delay = MIN_UPDATE_INTERVAL - elapsed;
      pendingUpdateTimerRef.current = setTimeout(doUpdate, delay);
      return () => {
        if (pendingUpdateTimerRef.current) {
          clearTimeout(pendingUpdateTimerRef.current);
          pendingUpdateTimerRef.current = null;
        }
      };
    }
  }, [comprehensiveData, enabled, isSinging, onError]);

  // Update volume when it changes
  useEffect(() => {
    if (enabled && isSinging) {
      setSingingVolume(volume);
    }
  }, [volume, enabled, isSinging]);

  // Manual control functions
  const start = useCallback(async () => {
    if (isSinging) return;
    
    try {
      // Ensure audio is unlocked before any async work (iOS)
      await ensureAudioUnlocked();
      
      // Fetch latest data
      const response = await apiRequest('GET', '/api/space-weather/comprehensive');
      const data = (await response.json()) as ComprehensiveSpaceWeatherData;
      
      // Map to Heliosinger
      const heliosingerData = mapSpaceWeatherToHeliosinger(
        data,
        mappingContextRef.current,
        { now: Date.now() }
      );
      currentDataRef.current = heliosingerData;
      
      // Start audio
      await startSinging(heliosingerData);
      setSingingVolume(volume);
      setIsSinging(true);
      
      // Invalidate query to ensure we have fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/space-weather/comprehensive'] });
    } catch (error) {
      console.error('Failed to start Heliosinger:', error);
      setIsSinging(false);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start audio'));
      }
      throw error;
    }
  }, [volume, onError, queryClient, isSinging]);

  const stop = useCallback(() => {
    if (!isSinging) return;
    
    stopSinging();
    setIsSinging(false);
    currentDataRef.current = null;
  }, [isSinging]);

  const setVolume = useCallback((newVolume: number) => {
    setSingingVolume(newVolume);
  }, []);

  const unlock = useCallback(async () => {
    await ensureAudioUnlocked();
  }, []);

  return {
    isSinging,
    currentData: currentDataRef.current,
    start,
    stop,
    setVolume,
    backgroundMode,
    unlock,
  };
}

/**
 * Hook specifically for the dashboard to manage Heliosinger mode
 */
export function useDashboardHeliosinger() {
  const [isHeliosingerMode, setIsHeliosingerMode] = useState(false);
  const [volume, setVolume] = useState(0.3);
  
  // Use the Heliosinger hook
  const heliosinger = useHeliosinger({
    enabled: isHeliosingerMode,
    volume,
    onError: (error) => {
      console.error('Heliosinger error:', error);
      // Fallback or show error
      setIsHeliosingerMode(false);
    }
  });

  // Toggle Heliosinger mode
  const toggleHeliosingerMode = useCallback((enabled: boolean) => {
    if (enabled && !heliosinger.isSinging) {
      // Unlock first to satisfy iOS gesture requirements
      heliosinger.unlock().then(() => heliosinger.start()).catch(console.error);
    } else if (!enabled && heliosinger.isSinging) {
      heliosinger.stop();
    }
    setIsHeliosingerMode(enabled);
  }, [heliosinger]);

  // Update volume
  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (isHeliosingerMode) {
      heliosinger.setVolume(newVolume);
    }
  }, [isHeliosingerMode, heliosinger]);

  return {
    isHeliosingerMode,
    toggleHeliosingerMode,
    volume,
    updateVolume,
    heliosinger,
  };
}

/**
 * Utility hook to get the current Heliosinger mapping without starting audio
 */
export function useHeliosingerPreview() {
  const mappingContextRef = useRef(createMappingContext());
  const { data: comprehensiveData } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ['/api/space-weather/comprehensive-preview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/space-weather/comprehensive');
      return (await response.json()) as ComprehensiveSpaceWeatherData;
    },
    enabled: false, // Don't auto-fetch
  });

  const getCurrentMapping = useCallback(() => {
    if (!comprehensiveData) {
      return createDefaultHeliosingerMapping();
    }
    return mapSpaceWeatherToHeliosinger(
      comprehensiveData,
      mappingContextRef.current,
      { now: Date.now() }
    );
  }, [comprehensiveData]);

  const previewMapping = useCallback(async () => {
    const response = await apiRequest('GET', '/api/space-weather/comprehensive');
    const data = (await response.json()) as ComprehensiveSpaceWeatherData;
    return mapSpaceWeatherToHeliosinger(
      data,
      mappingContextRef.current,
      { now: Date.now() }
    );
  }, []);

  return {
    getCurrentMapping,
    previewMapping,
    data: comprehensiveData,
  };
}

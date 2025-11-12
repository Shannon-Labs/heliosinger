import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mapSpaceWeatherToHeliosinger, createDefaultHeliosingerMapping } from '@/lib/heliosinger-mapping';
import { startSinging, updateSinging, stopSinging, setSingingVolume } from '@/lib/heliosinger-engine';
import { apiRequest } from '@/lib/queryClient';
import { getAmbientSettings } from '@/lib/localStorage';
import { checkAndNotifyEvents, requestNotificationPermission, canSendNotifications } from '@/lib/notifications';
import { calculateRefetchInterval } from '@/lib/adaptive-refetch';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface UseHeliosingerOptions {
  enabled: boolean;
  volume?: number;
  backgroundMode?: boolean;
  onError?: (error: Error) => void;
}

interface UseHeliosingerReturn {
  isSinging: boolean;
  currentData: ReturnType<typeof mapSpaceWeatherToHeliosinger> | null;
  start: () => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
  backgroundMode: boolean;
}

/**
 * Hook for managing Heliosinger - the sun singing space weather
 * Integrates with React Query for automatic data fetching and audio updates
 */
export function useHeliosinger(options: UseHeliosingerOptions): UseHeliosingerReturn {
  const { enabled, volume = 0.3, backgroundMode: backgroundModeProp = false, onError } = options;
  const queryClient = useQueryClient();
  const [isSinging, setIsSinging] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(backgroundModeProp);
  const currentDataRef = useRef<ReturnType<typeof mapSpaceWeatherToHeliosinger> | null>(null);
  const previousDataRef = useRef<ComprehensiveSpaceWeatherData | null>(null);
  
  // Request notification permission on first use
  useEffect(() => {
    if (enabled && !canSendNotifications()) {
      requestNotificationPermission().then(permission => {
        if (permission === 'granted') {
          console.log('🔔 Notification permission granted');
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
      // When tab becomes hidden, ensure audio context stays active
      if (document.hidden && isSinging) {
        // Audio should continue playing - browsers allow this if audio is already playing
        console.log('🌞 Tab hidden - audio continues in background mode');
      } else if (!document.hidden && isSinging) {
        // Tab visible again - ensure audio context is resumed
        console.log('🌞 Tab visible - audio continues');
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [backgroundMode, enabled, isSinging]);
  
  // Fetch comprehensive space weather data
  // Always fetch data (not just when enabled) so UI can display it
  // Uses adaptive refetch interval based on space weather conditions
  const { data: comprehensiveData, error: dataError } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ['/api/space-weather/comprehensive'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/space-weather/comprehensive');
      return (await response.json()) as ComprehensiveSpaceWeatherData;
    },
    refetchInterval: (query) => {
      // Calculate adaptive interval based on current and previous data
      const currentData = query.state.data;
      const interval = calculateRefetchInterval(currentData, previousDataRef.current);
      // Update previous data ref for next calculation
      if (currentData) {
        previousDataRef.current = currentData;
      }
      return interval;
    },
    enabled: true, // Always fetch for UI display
  });

  // Handle data errors
  useEffect(() => {
    if (dataError && onError) {
      onError(dataError instanceof Error ? dataError : new Error('Unknown data error'));
    }
  }, [dataError, onError]);

  // Start singing when enabled and data is available
  useEffect(() => {
    let isMounted = true;
    
    const startAudio = async () => {
      if (!enabled || !comprehensiveData) return;
      
      try {
        // Map space weather data to Heliosinger parameters
        const heliosingerData = mapSpaceWeatherToHeliosinger(comprehensiveData);
        currentDataRef.current = heliosingerData;
        
        // Start the Heliosinger engine
        await startSinging(heliosingerData);
        if (isMounted) {
          setIsSinging(true);
        }
        
        // Set initial volume
        setSingingVolume(volume);
        
        console.log('🌞 Heliosinger started:', {
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
        }
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to start audio'));
        }
      }
    };

    // Only start/stop based on enabled and data availability
    // Volume changes are handled by a separate effect
    if (enabled && comprehensiveData) {
      // Only start if not already singing (to avoid restarting on volume changes)
      if (!isSinging) {
        startAudio();
      } else {
        // If already singing, just update volume
        setSingingVolume(volume);
      }
    } else if (!enabled && isSinging) {
      // Stop if disabled
      stopSinging();
      setIsSinging(false);
    }
    
    return () => {
      isMounted = false;
      // Only cleanup if we're actually stopping (enabled changed to false)
      if (!enabled && isSinging) {
        stopSinging();
        setIsSinging(false);
      }
    };
  }, [enabled, comprehensiveData, volume, isSinging, onError]); // Include volume for initial setting

  // Update singing when data changes
  useEffect(() => {
    if (!enabled || !comprehensiveData || !isSinging) return;
    
    try {
      // Map new data to Heliosinger parameters
      const heliosingerData = mapSpaceWeatherToHeliosinger(comprehensiveData);
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
        
        // Check for events and send notifications
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
        console.log('🌞 Heliosinger updated:', {
          note: heliosingerData.baseNote,
          frequency: heliosingerData.frequency.toFixed(1) + ' Hz',
          vowel: heliosingerData.currentVowel.displayName,
          mood: heliosingerData.solarMood,
          harmonics: heliosingerData.harmonicCount,
          condition: heliosingerData.condition,
          kpIndex: heliosingerData.kIndex
        });
      }
      
      // Update the Heliosinger engine with new parameters
      updateSinging(heliosingerData);
      
      // Store previous data for next comparison
      previousDataRef.current = comprehensiveData;
    } catch (error) {
      console.error('Failed to update Heliosinger:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to update audio'));
      }
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
      // Fetch latest data
      const response = await apiRequest('GET', '/api/space-weather/comprehensive');
      const data = (await response.json()) as ComprehensiveSpaceWeatherData;
      
      // Map to Heliosinger
      const heliosingerData = mapSpaceWeatherToHeliosinger(data);
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

  return {
    isSinging,
    currentData: currentDataRef.current,
    start,
    stop,
    setVolume,
    backgroundMode,
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
      heliosinger.start().catch(console.error);
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
    return mapSpaceWeatherToHeliosinger(comprehensiveData);
  }, [comprehensiveData]);

  const previewMapping = useCallback(async () => {
    const response = await apiRequest('GET', '/api/space-weather/comprehensive');
    const data = (await response.json()) as ComprehensiveSpaceWeatherData;
    return mapSpaceWeatherToHeliosinger(data);
  }, []);

  return {
    getCurrentMapping,
    previewMapping,
    data: comprehensiveData,
  };
}

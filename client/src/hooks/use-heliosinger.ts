import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mapSpaceWeatherToHeliosinger, createDefaultHeliosingerMapping } from '@/lib/heliosinger-mapping';
import { startSinging, updateSinging, stopSinging, setSingingVolume } from '@/lib/heliosinger-engine';
import { apiRequest } from '@/lib/queryClient';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface UseHeliosingerOptions {
  enabled: boolean;
  volume?: number;
  onError?: (error: Error) => void;
}

interface UseHeliosingerReturn {
  isSinging: boolean;
  currentData: ReturnType<typeof mapSpaceWeatherToHeliosinger> | null;
  start: () => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
}

/**
 * Hook for managing Heliosinger - the sun singing space weather
 * Integrates with React Query for automatic data fetching and audio updates
 */
export function useHeliosinger(options: UseHeliosingerOptions): UseHeliosingerReturn {
  const { enabled, volume = 0.3, onError } = options;
  const queryClient = useQueryClient();
  const isSingingRef = useRef(false);
  const currentDataRef = useRef<ReturnType<typeof mapSpaceWeatherToHeliosinger> | null>(null);
  
  // Fetch comprehensive space weather data
  const { data: comprehensiveData, error: dataError } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ['/api/space-weather/comprehensive'],
    queryFn: () => apiRequest('GET', '/api/space-weather/comprehensive'),
    refetchInterval: 60000, // Update every minute
    enabled: enabled, // Only fetch when audio is enabled
  });

  // Handle data errors
  useEffect(() => {
    if (dataError && onError) {
      onError(dataError instanceof Error ? dataError : new Error('Unknown data error'));
    }
  }, [dataError, onError]);

  // Start singing when enabled
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
        isSingingRef.current = true;
        
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
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to start audio'));
        }
        isSingingRef.current = false;
      }
    };

    if (enabled) {
      startAudio();
    }
    
    return () => {
      isMounted = false;
      if (enabled) {
        stopSinging();
        isSingingRef.current = false;
      }
    };
  }, [enabled]); // Only restart when enabled changes

  // Update singing when data changes
  useEffect(() => {
    if (!enabled || !comprehensiveData || !isSingingRef.current) return;
    
    try {
      // Map new data to Heliosinger parameters
      const heliosingerData = mapSpaceWeatherToHeliosinger(comprehensiveData);
      const previousData = currentDataRef.current;
      currentDataRef.current = heliosingerData;
      
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
    } catch (error) {
      console.error('Failed to update Heliosinger:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to update audio'));
      }
    }
  }, [comprehensiveData, enabled]);

  // Update volume when it changes
  useEffect(() => {
    if (enabled && isSingingRef.current) {
      setSingingVolume(volume);
    }
  }, [volume, enabled]);

  // Manual control functions
  const start = useCallback(async () => {
    if (isSingingRef.current) return;
    
    try {
      // Fetch latest data
      const data = await apiRequest('GET', '/api/space-weather/comprehensive');
      
      // Map to Heliosinger
      const heliosingerData = mapSpaceWeatherToHeliosinger(data);
      currentDataRef.current = heliosingerData;
      
      // Start audio
      await startSinging(heliosingerData);
      setSingingVolume(volume);
      isSingingRef.current = true;
      
      // Invalidate query to ensure we have fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/space-weather/comprehensive'] });
    } catch (error) {
      console.error('Failed to start Heliosinger:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start audio'));
      }
      throw error;
    }
  }, [volume, onError, queryClient]);

  const stop = useCallback(() => {
    if (!isSingingRef.current) return;
    
    stopSinging();
    isSingingRef.current = false;
    currentDataRef.current = null;
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setSingingVolume(newVolume);
  }, []);

  return {
    isSinging: isSingingRef.current,
    currentData: currentDataRef.current,
    start,
    stop,
    setVolume,
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
    queryFn: () => apiRequest('GET', '/api/space-weather/comprehensive'),
    enabled: false, // Don't auto-fetch
  });

  const getCurrentMapping = useCallback(() => {
    if (!comprehensiveData) {
      return createDefaultHeliosingerMapping();
    }
    return mapSpaceWeatherToHeliosinger(comprehensiveData);
  }, [comprehensiveData]);

  const previewMapping = useCallback(async () => {
    const data = await apiRequest('GET', '/api/space-weather/comprehensive');
    return mapSpaceWeatherToHeliosinger(data);
  }, []);

  return {
    getCurrentMapping,
    previewMapping,
    data: comprehensiveData,
  };
}

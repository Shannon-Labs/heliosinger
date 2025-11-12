import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mapSpaceWeatherToAudio, createDefaultAudioMapping } from '@/lib/audio-mapping';
import { startEnhancedAmbient, updateEnhancedAmbient, stopEnhancedAmbient, setEnhancedAmbientVolume } from '@/lib/enhanced-audio-engine';
import { apiRequest } from '@/lib/queryClient';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface UseEnhancedAudioOptions {
  enabled: boolean;
  volume?: number;
  onError?: (error: Error) => void;
}

interface UseEnhancedAudioReturn {
  isActive: boolean;
  currentMapping: ReturnType<typeof mapSpaceWeatherToAudio> | null;
  start: () => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
}

/**
 * Hook for managing enhanced multi-parameter audio sonification
 * Integrates with React Query for automatic data fetching and audio updates
 */
export function useEnhancedAudio(options: UseEnhancedAudioOptions): UseEnhancedAudioReturn {
  const { enabled, volume = 0.3, onError } = options;
  const queryClient = useQueryClient();
  const isActiveRef = useRef(false);
  const currentMappingRef = useRef<ReturnType<typeof mapSpaceWeatherToAudio> | null>(null);
  
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

  // Start audio engine when enabled
  useEffect(() => {
    let isMounted = true;
    
    const startAudio = async () => {
      if (!enabled || !comprehensiveData) return;
      
      try {
        // Map space weather data to audio parameters
        const audioMapping = mapSpaceWeatherToAudio(comprehensiveData);
        currentMappingRef.current = audioMapping;
        
        // Start the enhanced audio engine
        await startEnhancedAmbient(audioMapping);
        isActiveRef.current = true;
        
        // Set initial volume
        setEnhancedAmbientVolume(volume);
        
        console.log('Enhanced audio started:', {
          note: audioMapping.baseNote,
          frequency: audioMapping.frequency.toFixed(2) + ' Hz',
          harmonics: audioMapping.harmonicCount,
          condition: audioMapping.condition,
          kpIndex: audioMapping.kIndex
        });
      } catch (error) {
        console.error('Failed to start enhanced audio:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to start audio'));
        }
        isActiveRef.current = false;
      }
    };

    if (enabled) {
      startAudio();
    }
    
    return () => {
      isMounted = false;
      if (enabled) {
        stopEnhancedAmbient();
        isActiveRef.current = false;
      }
    };
  }, [enabled]); // Only restart when enabled changes, not on every data update

  // Update audio when data changes
  useEffect(() => {
    if (!enabled || !comprehensiveData || !isActiveRef.current) return;
    
    try {
      // Map new data to audio parameters
      const audioMapping = mapSpaceWeatherToAudio(comprehensiveData);
      const previousMapping = currentMappingRef.current;
      currentMappingRef.current = audioMapping;
      
      // Only log significant changes
      if (!previousMapping || 
          Math.abs(audioMapping.frequency - previousMapping.frequency) > 10 ||
          audioMapping.condition !== previousMapping.condition ||
          audioMapping.harmonicCount !== previousMapping.harmonicCount) {
        console.log('Audio parameters updated:', {
          note: audioMapping.baseNote,
          frequency: audioMapping.frequency.toFixed(2) + ' Hz',
          harmonics: audioMapping.harmonicCount,
          condition: audioMapping.condition,
          kpIndex: audioMapping.kIndex,
          bz: audioMapping.detuneCents + ' cents detune'
        });
      }
      
      // Update the audio engine with new parameters
      updateEnhancedAmbient(audioMapping);
    } catch (error) {
      console.error('Failed to update enhanced audio:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to update audio'));
      }
    }
  }, [comprehensiveData, enabled]);

  // Update volume when it changes
  useEffect(() => {
    if (enabled && isActiveRef.current) {
      setEnhancedAmbientVolume(volume);
    }
  }, [volume, enabled]);

  // Manual control functions
  const start = useCallback(async () => {
    if (isActiveRef.current) return;
    
    try {
      // Fetch latest data
      const data = await apiRequest('GET', '/api/space-weather/comprehensive');
      
      // Map to audio
      const audioMapping = mapSpaceWeatherToAudio(data);
      currentMappingRef.current = audioMapping;
      
      // Start audio
      await startEnhancedAmbient(audioMapping);
      setEnhancedAmbientVolume(volume);
      isActiveRef.current = true;
      
      // Invalidate query to ensure we have fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/space-weather/comprehensive'] });
    } catch (error) {
      console.error('Failed to start enhanced audio:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start audio'));
      }
      throw error;
    }
  }, [volume, onError, queryClient]);

  const stop = useCallback(() => {
    if (!isActiveRef.current) return;
    
    stopEnhancedAmbient();
    isActiveRef.current = false;
    currentMappingRef.current = null;
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setEnhancedAmbientVolume(newVolume);
  }, []);

  return {
    isActive: isActiveRef.current,
    currentMapping: currentMappingRef.current,
    start,
    stop,
    setVolume,
  };
}

/**
 * Hook specifically for the dashboard to manage both audio modes
 */
export function useDashboardAudio() {
  const [isEnhancedMode, setIsEnhancedMode] = useState(false);
  const [volume, setVolume] = useState(0.3);
  
  // Use the enhanced audio hook
  const enhancedAudio = useEnhancedAudio({
    enabled: isEnhancedMode,
    volume,
    onError: (error) => {
      console.error('Enhanced audio error:', error);
      // Fallback to simple mode or show error
      setIsEnhancedMode(false);
    }
  });

  // Toggle between audio modes
  const toggleEnhancedMode = useCallback((enabled: boolean) => {
    if (enabled && !enhancedAudio.isActive) {
      enhancedAudio.start().catch(console.error);
    } else if (!enabled && enhancedAudio.isActive) {
      enhancedAudio.stop();
    }
    setIsEnhancedMode(enabled);
  }, [enhancedAudio]);

  // Update volume for both modes
  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (isEnhancedMode) {
      enhancedAudio.setVolume(newVolume);
    }
  }, [isEnhancedMode, enhancedAudio]);

  return {
    isEnhancedMode,
    toggleEnhancedMode,
    volume,
    updateVolume,
    enhancedAudio,
  };
}

/**
 * Utility hook to get the current audio mapping without starting audio
 */
export function useAudioPreview() {
  const { data: comprehensiveData } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ['/api/space-weather/comprehensive-preview'],
    queryFn: () => apiRequest('GET', '/api/space-weather/comprehensive'),
    enabled: false, // Don't auto-fetch
  });

  const getCurrentMapping = useCallback(() => {
    if (!comprehensiveData) {
      return createDefaultAudioMapping();
    }
    return mapSpaceWeatherToAudio(comprehensiveData);
  }, [comprehensiveData]);

  const previewMapping = useCallback(async () => {
    const data = await apiRequest('GET', '/api/space-weather/comprehensive');
    return mapSpaceWeatherToAudio(data);
  }, []);

  return {
    getCurrentMapping,
    previewMapping,
    data: comprehensiveData,
  };
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { SolarHologram } from "@/components/SolarHologram";
import { SonificationTrainer } from "@/components/SonificationTrainer";
import { EnhancedSpaceWeatherViz } from "@/components/EnhancedSpaceWeatherViz";
import { EventsTicker } from "@/components/EventsTicker";
import { BrutalistLogo } from "@/components/BrutalistLogo";
import { SystemTerminal } from "@/components/SystemTerminal";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { BreakingNewsBanner } from "@/components/stream-enhancements/BreakingNewsBanner";
import { AnimatedMetrics } from "@/components/stream-enhancements/AnimatedMetrics";
import { StreamIntro } from "@/components/stream-enhancements/StreamIntro";
import { ViewerReactions } from "@/components/stream-enhancements/ViewerReactions";
import { EventOverlay } from "@/components/stream-enhancements/EventOverlay";
import { apiRequest } from "@/lib/queryClient";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import { calculateRefetchInterval } from "@/lib/adaptive-refetch";
import type { ComprehensiveSpaceWeatherData, SolarWindReading } from "@shared/schema";

export default function StreamView() {
  // Show intro on first load
  const [showIntro, setShowIntro] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);

  // Heliosinger hook - auto-enabled
  const [isHeliosingerEnabled, setIsHeliosingerEnabled] = useState(true);
  
  const heliosinger = useHeliosinger({
    enabled: isHeliosingerEnabled,
    volume: 0.6, // Louder for stream
    backgroundMode: true, // Always background mode for stream
    onError: (error) => console.error("Stream Audio Error:", error)
  });

  // Auto-start audio on mount (might need interaction policy check, but for stream setup usually user interacts once)
  useEffect(() => {
    const startAudio = async () => {
      try {
        await heliosinger.unlock();
        if (!heliosinger.isSinging) {
          await heliosinger.start();
        }
      } catch (e) {
        console.warn("Auto-start failed, waiting for interaction", e);
      }
    };
    
    // Only start audio after intro completes
    if (introComplete) {
      startAudio();
    }
    
    // Add click listener to body to ensure unlock
    const unlockHandler = () => {
      startAudio();
      document.removeEventListener('click', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);
    
    return () => document.removeEventListener('click', unlockHandler);
  }, [introComplete, heliosinger]);

  // Data fetching logic (same as dashboard)
  const [updateFrequency, setUpdateFrequency] = useState(60000);
  const previousComprehensiveDataRef = useRef<ComprehensiveSpaceWeatherData | undefined>(undefined);

  const { data: comprehensiveData } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ["/api/space-weather/comprehensive"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/space-weather/comprehensive");
      return (await response.json()) as ComprehensiveSpaceWeatherData;
    },
    refetchInterval: (query) => {
      const currentData = query.state.data;
      const interval = calculateRefetchInterval(currentData, previousComprehensiveDataRef.current);
      setUpdateFrequency(interval);
      if (currentData) {
        previousComprehensiveDataRef.current = currentData;
      }
      return interval;
    },
  });

  const fetchDataMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/solar-wind/fetch"),
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: ["/api/solar-wind"] });
    }
  });

  useEffect(() => {
    fetchDataMutation.mutate();
    const interval = setInterval(() => {
      fetchDataMutation.mutate();
    }, updateFrequency);
    return () => clearInterval(interval);
  }, [updateFrequency]);

  // Handle intro completion
  const handleIntroComplete = () => {
    setIntroComplete(true);
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden flex flex-col">
      {/* Stream Intro Animation */}
      {showIntro && (
        <StreamIntro onComplete={handleIntroComplete} />
      )}

      {/* Breaking News Banner for major events */}
      {introComplete && <BreakingNewsBanner data={comprehensiveData} />}

      <div className="p-6 flex items-center justify-between border-b-4 border-primary bg-black z-10 relative">
        <div className="flex items-center gap-6">
          {/* Logo wrapper to ensure no overlap from transform if we were to use it, but removing scale is safer */}
          <BrutalistLogo className="h-12 w-auto" />
          <div className="flex flex-col justify-center">
            <span className="text-2xl font-black uppercase tracking-tighter text-white leading-none">
              Live Space Weather Sonification
            </span>
            <span className="text-sm font-mono text-primary uppercase tracking-widest">
              Real-time Solar Wind Data Stream
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-destructive text-white font-bold uppercase border-2 border-white animate-pulse">
             <div className="w-3 h-3 bg-white rounded-full" />
             LIVE
           </div>
        </div>
      </div>

      {/* Animated Metrics Bar */}
      {introComplete && comprehensiveData && (
        <div className="border-b-2 border-primary/30 p-4 bg-black/90 backdrop-blur-sm">
          <AnimatedMetrics data={comprehensiveData} />
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Column: Visuals (8 cols) */}
        <div className="lg:col-span-8 relative border-r-4 border-primary bg-black flex flex-col overflow-hidden h-full">
          <EventOverlay current={comprehensiveData} previous={previousComprehensiveDataRef.current} />
          {/* Hologram takes up most space */}
          <div className="flex-1 relative min-h-0">
            <SolarHologram
              data={comprehensiveData}
              heliosingerData={heliosinger.currentData}
              isPlaying={true}
              mode="stream"
            />
            
            {/* Overlay Ticker */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/80 border-t-4 border-primary p-4 backdrop-blur-sm">
               {comprehensiveData && (
                 <EventsTicker 
                   currentData={comprehensiveData} 
                   previousData={previousComprehensiveDataRef.current}
                 />
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Data & Training (4 cols) */}
        <div className="lg:col-span-4 bg-black flex flex-col h-full overflow-hidden">
          {/* Top Half: Scrollable Data */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Sonification Trainer - The "Why" */}
            {heliosinger.currentData && (
              <SonificationTrainer 
                currentData={heliosinger.currentData}
                comprehensiveData={comprehensiveData}
              />
            )}

            {/* Detailed Viz */}
            <EnhancedSpaceWeatherViz data={comprehensiveData} />
          </div>

          {/* Bottom: System Terminal (Fixed height) */}
          <div className="h-48 border-t-4 border-primary">
            <SystemTerminal />
          </div>
          
          {/* Footer Info */}
          <div className="border-t-2 border-white/20 p-2 bg-black">
            <p className="text-xs font-mono text-muted-foreground text-center uppercase">
              Powered by NOAA DSCOVR • Heliosinger Engine v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

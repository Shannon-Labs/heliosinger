import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { SolarHologram } from "@/components/SolarHologram";
import { SonificationTrainer } from "@/components/SonificationTrainer";
import { EventsTicker } from "@/components/EventsTicker";
import { BrutalistLogo } from "@/components/BrutalistLogo";
import { SystemTerminal } from "@/components/SystemTerminal";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import { BreakingNewsBanner } from "@/components/stream-enhancements/BreakingNewsBanner";
import { StreamIntro } from "@/components/stream-enhancements/StreamIntro";
import { ViewerReactions } from "@/components/stream-enhancements/ViewerReactions";
import { EventOverlay } from "@/components/stream-enhancements/EventOverlay";
import { apiRequest } from "@/lib/queryClient";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import { calculateRefetchInterval } from "@/lib/adaptive-refetch";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
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

  // Handle manual audio start
  const toggleAudio = async () => {
    if (heliosinger.isSinging) {
      heliosinger.stop();
    } else {
      try {
        await heliosinger.unlock();
        await heliosinger.start();
      } catch (e) {
        console.error("Failed to start audio", e);
      }
    }
  };

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

      <div className="p-4 md:p-6 flex items-center justify-between border-b-4 border-primary bg-black z-10 relative">
        <div className="flex items-center gap-6 overflow-hidden">
          {/* Logo wrapper to ensure no overlap */}
          <div className="shrink-0">
            <BrutalistLogo className="h-12 w-auto" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <span className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white leading-tight truncate">
              Live Space Weather Sonification
            </span>
            <span className="text-xs md:text-sm font-mono text-primary uppercase tracking-widest truncate">
              Real-time Solar Wind Data Stream
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
           <Button
             variant="outline"
             size="sm"
             className="h-10 px-4 border-2 border-white bg-black hover:bg-white hover:text-black font-black tracking-widest uppercase transition-colors"
             onClick={toggleAudio}
           >
             {heliosinger.isSinging ? (
               <>
                 <Volume2 className="w-4 h-4 mr-2" />
                 MUTE AUDIO
               </>
             ) : (
               <>
                 <VolumeX className="w-4 h-4 mr-2" />
                 ENABLE AUDIO
               </>
             )}
           </Button>
           <div className="flex items-center gap-2 px-4 py-2 bg-destructive text-white font-bold uppercase border-2 border-white animate-pulse hidden md:flex">
             <div className="w-3 h-3 bg-white rounded-full" />
             LIVE
           </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* Left Column: Visuals (8 cols) */}
        <div className="lg:col-span-8 relative border-r-4 border-primary bg-black flex flex-col h-full overflow-hidden">
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
        <div className="lg:col-span-4 bg-black flex flex-col h-full overflow-hidden border-l-4 border-primary">
          
          {/* Top 1/3: Educational / Trainer */}
          <div className="flex-[1] border-b-4 border-primary overflow-y-auto bg-black/90">
             <div className="p-4 sticky top-0 bg-black/95 backdrop-blur z-10 border-b border-white/10">
               <h3 className="font-black text-white uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 bg-primary rounded-full" />
                 Training Module
               </h3>
             </div>
             <div className="p-4 pt-0">
               {heliosinger.currentData && (
                  <SonificationTrainer 
                    currentData={heliosinger.currentData}
                    comprehensiveData={comprehensiveData}
                  />
                )}
             </div>
          </div>

          {/* Bottom 2/3: System Log */}
          <div className="flex-[2] flex flex-col min-h-0">
            <div className="p-2 border-b-2 border-white/20 bg-primary/10 shrink-0">
              <h3 className="font-black text-primary uppercase tracking-widest text-xs">
                SYSTEM LOG // OPERATIONS
              </h3>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="absolute inset-0">
                <SystemTerminal data={comprehensiveData} />
              </div>
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="border-t-2 border-white/20 p-2 bg-black shrink-0">
            <p className="text-[10px] font-mono text-muted-foreground text-center uppercase">
              Powered by NOAA DSCOVR • Heliosinger Engine v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

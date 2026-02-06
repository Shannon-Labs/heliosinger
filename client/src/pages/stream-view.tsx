import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { BrutalistLogo } from "@/components/BrutalistLogo";

const SolarHologram = lazy(() => import("@/components/SolarHologram").then(m => ({ default: m.SolarHologram })));
import { apiRequest } from "@/lib/queryClient";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import { calculateRefetchInterval } from "@/lib/adaptive-refetch";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";

export default function StreamView() {
  // Heliosinger hook - auto-enabled
  const [isHeliosingerEnabled, setIsHeliosingerEnabled] = useState(true);

  const heliosinger = useHeliosinger({
    enabled: isHeliosingerEnabled,
    volume: 0.4, // Aligned closer to dashboard (0.3) but slightly audible for stream
    backgroundMode: true,
    onError: (error) => console.error("Stream Audio Error:", error)
  });

  // Data fetching logic
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

  // Auto-start audio on mount
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
    
    startAudio();
    
    // Add click listener to body to ensure unlock
    const unlockHandler = () => {
      startAudio();
      document.removeEventListener('click', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);
    
    return () => document.removeEventListener('click', unlockHandler);
  }, [heliosinger]);

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

  const solarWind = comprehensiveData?.solar_wind ?? null;
  const kIndex = comprehensiveData?.k_index?.kp ?? null;
  const currentVowel = heliosinger.currentData?.currentVowel;
  const chordQuality = heliosinger.currentData?.chordQuality;

  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden flex flex-col">
      <div className="flex-1 flex flex-col">
        {/* Top band: Telemetry & Controls */}
        <div className="p-2 sm:p-4 border-b-2 sm:border-b-4 border-primary bg-black relative flex flex-col gap-2 sm:gap-4 z-20 shadow-xl">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <BrutalistLogo className="h-8 sm:h-10 w-auto flex-shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-sm sm:text-lg font-black uppercase tracking-tighter text-white leading-tight truncate">
                  Solar Telemetry
                </span>
                <span className="text-[10px] sm:text-xs font-mono text-primary uppercase tracking-wider sm:tracking-widest">
                  Stream Mode
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div
                key={comprehensiveData?.timestamp || 'live'}
                className="hidden md:flex items-center gap-2 px-3 py-1 bg-destructive text-white font-bold uppercase border border-white text-xs"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Live
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 sm:h-9 px-2 sm:px-4 border border-white bg-black hover:bg-white hover:text-black font-bold tracking-wider uppercase transition-colors text-[10px] sm:text-xs"
                onClick={toggleAudio}
              >
                {heliosinger.isSinging ? (
                  <>
                    <Volume2 className="w-3 h-3 sm:mr-2" />
                    <span className="hidden sm:inline">MUTE</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="w-3 h-3 sm:mr-2" />
                    <span className="hidden sm:inline">ENABLE</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-3">
            <div className="bg-black/70 border border-primary px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs uppercase font-black text-primary">
                Vel
                <span className="text-white text-sm sm:text-base ml-1 sm:ml-2">
                  {solarWind ? `${solarWind.velocity.toFixed(0)}` : "--"} <span className="text-[9px] sm:text-[10px] opacity-50">km/s</span>
                </span>
              </div>
            </div>
            <div className="bg-white text-black border border-black px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs uppercase font-black">
                Den
                <span className="text-sm sm:text-base ml-1 sm:ml-2">
                  {solarWind ? `${solarWind.density.toFixed(1)}` : "--"} <span className="text-[9px] sm:text-[10px] opacity-50">p/cc</span>
                </span>
              </div>
            </div>
            <div className="bg-destructive text-white border border-black px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs uppercase font-black">
                Bz
                <span className="text-sm sm:text-base ml-1 sm:ml-2">
                  {solarWind ? `${solarWind.bz.toFixed(1)}` : "--"} <span className="text-[9px] sm:text-[10px] opacity-50">nT</span>
                </span>
              </div>
            </div>
            <div className="bg-primary text-black border border-black px-2 sm:px-3 py-1.5 sm:py-2">
              <div className="flex items-center justify-between text-[10px] sm:text-xs uppercase font-black">
                Kp
                <span className="text-sm sm:text-base ml-1 sm:ml-2">
                  {kIndex !== null && kIndex !== undefined ? kIndex.toFixed(1) : "--"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main visualization canvas */}
        <div className="flex-1 relative bg-black overflow-hidden">
          {/* 3D Solar Hologram */}
          <div className="absolute inset-0">
            <Suspense fallback={<div className="w-full h-full bg-black" />}>
              <SolarHologram
                data={comprehensiveData}
                heliosingerData={heliosinger.currentData}
                isPlaying={true}
                mode="stream"
              />
            </Suspense>
          </div>
        </div>

        {/* Bottom minimal footer */}
        <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-black border-t border-white/10 flex justify-between items-center text-[9px] sm:text-[10px] uppercase font-mono text-white/40 z-20 gap-2">
           <span className="truncate">Heliosinger v2.0</span>
           <span className="flex-shrink-0">NOAA // {new Date().toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
}

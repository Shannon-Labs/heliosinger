import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { SolarHologram } from "@/components/SolarHologram";
import { BrutalistLogo } from "@/components/BrutalistLogo";
import { SystemTerminal } from "@/components/SystemTerminal";
import { BreakingNewsBanner } from "@/components/stream-enhancements/BreakingNewsBanner";
import { StreamIntro } from "@/components/stream-enhancements/StreamIntro";
import { EventOverlay } from "@/components/stream-enhancements/EventOverlay";
import { apiRequest } from "@/lib/queryClient";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import { calculateRefetchInterval } from "@/lib/adaptive-refetch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Volume2, VolumeX } from "lucide-react";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";

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

  const solarWind = comprehensiveData?.solar_wind ?? null;
  const kIndex = comprehensiveData?.k_index?.kp ?? null;
  const currentVowel = heliosinger.currentData?.currentVowel;
  const chordQuality = heliosinger.currentData?.chordQuality;

  const vowelCue = (() => {
    if (!currentVowel || !solarWind) return "Training mode listening for live changes.";
    switch (currentVowel.displayName) {
      case "I":
        return "Fast, hot wind or southward Bz pushes the voice bright (\"ee\").";
      case "E":
        return "Moderate activity leans into a focused \"eh\" timbre.";
      case "A":
        return "Open plasma and calm field widen the vowel toward \"ah\".";
      case "O":
        return "Northward or rising density rounds toward \"oh\".";
      case "U":
        return "Slow or dense wind dampens into \"oo\" darkness.";
      default:
        return "The sun shifts vowels as data flexes.";
    }
  })();

  return (
    <div className="min-h-screen bg-black text-foreground overflow-hidden flex flex-col">
      {/* Stream Intro Animation */}
      {showIntro && (
        <StreamIntro onComplete={handleIntroComplete} />
      )}

      {/* Breaking News Banner for major events */}
      {introComplete && <BreakingNewsBanner data={comprehensiveData} />}

      <div className="flex-1 flex flex-col">
        {/* Top band ~1/5: logo + telemetry + audio/training info */}
        <div className="p-4 md:p-6 border-b-4 border-primary bg-black relative basis-[22vh] min-h-[220px] flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BrutalistLogo className="h-12 w-auto" />
              <div className="flex flex-col">
                <span className="text-xl md:text-2xl font-black uppercase tracking-tighter text-white leading-tight">
                  Solar Telemetry + Audio Synthesis
                </span>
                <span className="text-xs md:text-sm font-mono text-primary uppercase tracking-widest">
                  Live stream // NOAA DSCOVR feed
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-destructive text-white font-bold uppercase border-2 border-white animate-pulse">
                <div className="w-3 h-3 bg-white rounded-full" />
                Live
              </div>
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
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-black/70 border-2 border-primary px-3 py-2 -skew-x-6 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
              <div className="skew-x-6 flex items-center justify-between text-xs uppercase font-black text-primary">
                Vel
                <span className="text-white text-lg">
                  {solarWind ? `${solarWind.velocity.toFixed(0)} km/s` : "--"}
                </span>
              </div>
            </div>
            <div className="bg-white text-black border-2 border-black px-3 py-2 -skew-x-6 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
              <div className="skew-x-6 flex items-center justify-between text-xs uppercase font-black">
                Density
                <span className="text-lg">
                  {solarWind ? `${solarWind.density.toFixed(1)} p/cc` : "--"}
                </span>
              </div>
            </div>
            <div className="bg-destructive text-white border-2 border-black px-3 py-2 -skew-x-6 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
              <div className="skew-x-6 flex items-center justify-between text-xs uppercase font-black">
                Bz
                <span className="text-lg">
                  {solarWind ? `${solarWind.bz.toFixed(1)} nT` : "--"}
                </span>
              </div>
            </div>
            <div className="bg-primary text-black border-2 border-black px-3 py-2 -skew-x-6 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
              <div className="skew-x-6 flex items-center justify-between text-xs uppercase font-black">
                Kp
                <span className="text-lg">
                  {kIndex !== null && kIndex !== undefined ? kIndex.toFixed(1) : "--"}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-black/70 border-2 border-white px-4 py-3 -skew-x-6 shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
              <div className="skew-x-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase text-white/70 font-bold">Pitch // Base</p>
                  <p className="text-xl font-black text-white tracking-tight">{heliosinger.currentData?.baseNote ?? "--"}</p>
                </div>
                <div className="text-right text-xs text-white/60 font-mono">
                  {heliosinger.currentData ? `${heliosinger.currentData.frequency.toFixed(0)} Hz` : ""}
                </div>
              </div>
            </div>

            <div className="bg-white text-black border-2 border-black px-4 py-3 -skew-x-6 shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
              <div className="skew-x-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase text-black/70 font-bold">Chord // Training</p>
                  <p className="text-xl font-black tracking-tight">
                    {chordQuality?.symbol ?? "..."} {chordQuality?.name ? `(${chordQuality.name})` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="skew-x-0 bg-black text-white border-2 border-black rounded-none">
                  Training
                </Badge>
              </div>
              <p className="skew-x-6 text-[11px] uppercase text-black/70 mt-2 truncate">
                Vowel {currentVowel?.displayName ?? "—"} · {vowelCue}
              </p>
            </div>

            <div className="bg-primary text-black border-2 border-black px-4 py-3 -skew-x-6 shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
              <div className="skew-x-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase font-black">Mood</p>
                  <p className="text-xl font-black tracking-tight">
                    {heliosinger.currentData?.solarMood ?? "Calibrating"}
                  </p>
                </div>
                <div className="text-right text-xs font-mono">
                  {heliosinger.currentData?.condition ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle band: open canvas with hologram + overlays */}
        <div className="flex-1 relative bg-black border-y-4 border-primary overflow-hidden">
          <EventOverlay current={comprehensiveData} previous={previousComprehensiveDataRef.current} />
          <div className="absolute inset-0">
            <SolarHologram
              data={comprehensiveData}
              heliosingerData={heliosinger.currentData}
              isPlaying={true}
              mode="stream"
            />
          </div>
        </div>

        {/* Bottom band ~1/5: system log */}
        <div className="basis-[22vh] min-h-[200px] border-t-4 border-primary bg-black flex flex-col">
          <div className="p-3 border-b-2 border-white/20 bg-primary/20 flex items-center justify-between">
            <h3 className="font-black text-primary uppercase tracking-widest text-xs">
              System Log // Operations
            </h3>
            <span className="text-[10px] font-mono text-white/70 uppercase">
              NOAA • Heliosinger Engine v2.0
            </span>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0">
              <SystemTerminal data={comprehensiveData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { SystemStatus } from "@/components/system-status";
import { Footer } from "@/components/Footer";
import { EventsTicker } from "@/components/EventsTicker";
import { MobilePlayer } from "@/components/MobilePlayer";
import { BrutalistLogo } from "@/components/BrutalistLogo";
import { SonificationTrainer } from "@/components/SonificationTrainer";
import { EducationalInsight } from "@/components/stream-enhancements/EducationalInsight";
import { DataDashboard } from "@/components/data-dashboard";

const SolarHologram = lazy(() => import("@/components/SolarHologram").then(m => ({ default: m.SolarHologram })));
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAmbientSettings, saveAmbientSettings } from "@/lib/localStorage";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import { useEducationalNarrator } from "@/hooks/use-educational-narrator";
import { mapSpaceWeatherToHeliosinger } from "@/lib/heliosinger-mapping";
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  requestNotificationPermission,
  isNotificationSupported,
  canSendNotifications
} from "@/lib/notifications";
import { calculateRefetchInterval, getUpdateFrequencyDescription } from "@/lib/adaptive-refetch";
import { getChordQuality } from "@/lib/chord-utils";
import type { AmbientSettings, ComprehensiveSpaceWeatherData, SolarWindReading, SystemStatus as SystemStatusType } from "@shared/schema";

type ImplicationTone = "calm" | "watch" | "alert";
type Implication = { title: string; detail: string; tone: ImplicationTone };
const IMPLICATION_TONE_STYLES: Record<ImplicationTone, string> = {
  calm: "border-emerald-400/40 text-emerald-200 bg-emerald-500/10",
  watch: "border-amber-400/40 text-amber-200 bg-amber-500/10",
  alert: "border-destructive/60 text-destructive bg-destructive/10",
};

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Heliosinger hook - primary sonification system
  const [isHeliosingerEnabled, setIsHeliosingerEnabled] = useState(true);
  const [ambientVolume, setAmbientVolume] = useState(0.4);
  const [backgroundMode, setBackgroundMode] = useState(true);
  
  const heliosinger = useHeliosinger({
    enabled: isHeliosingerEnabled,
    volume: ambientVolume,
    backgroundMode: backgroundMode,
    onError: (error) => {
      toast({
        title: "Heliosinger Error",
        description: error.message,
        variant: "destructive",
      });
      setIsHeliosingerEnabled(false);
    }
  });

  // Local state for adaptive refetch interval (must be declared before queries that use it)
  const [updateFrequency, setUpdateFrequency] = useState(60000);
  const previousComprehensiveDataRef = useRef<ComprehensiveSpaceWeatherData | undefined>(undefined);

  // Fetch comprehensive space weather data (used for adaptive interval calculation)
  const { data: comprehensiveData, isLoading: comprehensiveLoading } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ["/api/space-weather/comprehensive"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/space-weather/comprehensive");
      return (await response.json()) as ComprehensiveSpaceWeatherData;
    },
    refetchInterval: (query) => {
      // Calculate adaptive interval based on current and previous data
      const currentData = query.state.data;
      const interval = calculateRefetchInterval(currentData, previousComprehensiveDataRef.current);
      setUpdateFrequency(interval);
      // Update previous data ref for next calculation
      if (currentData) {
        previousComprehensiveDataRef.current = currentData;
      }
      return interval;
    },
  });

  const heliosingerPreviewData = useMemo(() => {
    if (heliosinger.currentData) return heliosinger.currentData;
    if (!comprehensiveData) return null;
    try {
      return mapSpaceWeatherToHeliosinger(comprehensiveData);
    } catch (error) {
      console.warn("Failed to map space weather for insights:", error);
      return null;
    }
  }, [heliosinger.currentData, comprehensiveData]);

  const narrator = useEducationalNarrator({
    currentData: comprehensiveData,
    previousData: previousComprehensiveDataRef.current,
    heliosingerData: heliosingerPreviewData,
    enabled: true,
  });

  const implications = useMemo<Implication[]>(() => {
    if (!comprehensiveData?.solar_wind) return [];

    const items: Implication[] = [];
    const kp = comprehensiveData.k_index?.kp;
    const bz = comprehensiveData.solar_wind.bz ?? 0;
    const velocity = comprehensiveData.solar_wind.velocity ?? 0;
    const density = comprehensiveData.solar_wind.density ?? 0;
    const flareClass = comprehensiveData.xray_flux?.flare_class;
    const proton10 = comprehensiveData.proton_flux?.flux_10mev;

    if (kp !== undefined) {
      if (kp >= 7) {
        items.push({
          title: "Severe geomagnetic storm",
          detail: "Auroras can expand toward lower latitudes. Satellite drag and power grid impacts become more likely.",
          tone: "alert",
        });
      } else if (kp >= 5) {
        items.push({
          title: "Geomagnetic storm",
          detail: "Auroras likely at mid-latitudes. HF radio and satellite operations can be affected.",
          tone: "watch",
        });
      } else if (kp >= 4) {
        items.push({
          title: "Active geomagnetic conditions",
          detail: "Auroras possible at higher latitudes; the magnetosphere is unsettled.",
          tone: "watch",
        });
      } else if (kp >= 2) {
        items.push({
          title: "Quiet geomagnetic conditions",
          detail: "Stable magnetosphere with low disturbance risk.",
          tone: "calm",
        });
      }
    }

    if (bz <= -10) {
      items.push({
        title: "Strong southward IMF",
        detail: "Energy coupling is efficient; activity may intensify quickly.",
        tone: "alert",
      });
    } else if (bz <= -5) {
      items.push({
        title: "Southward IMF",
        detail: "Reconnection is favored; auroral activity becomes more likely.",
        tone: "watch",
      });
    } else if (bz >= 5) {
      items.push({
        title: "Northward IMF",
        detail: "Magnetic shielding is strong; conditions are typically calmer.",
        tone: "calm",
      });
    }

    if (velocity >= 650) {
      items.push({
        title: "High-speed solar wind",
        detail: "Fast streams can sustain elevated activity for hours to days.",
        tone: "watch",
      });
    } else if (velocity >= 550) {
      items.push({
        title: "Elevated solar wind speed",
        detail: "Faster wind can increase coupling and build activity.",
        tone: "watch",
      });
    }

    if (density >= 20) {
      items.push({
        title: "Compression region",
        detail: "High density can drive sudden impulses and short-term geomagnetic jolts.",
        tone: "watch",
      });
    } else if (density <= 2) {
      items.push({
        title: "Rarefied plasma",
        detail: "Sparse wind is usually less geoeffective and sounds more open.",
        tone: "calm",
      });
    }

    if (flareClass && (flareClass.startsWith("M") || flareClass.startsWith("X"))) {
      items.push({
        title: `${flareClass}-class flare`,
        detail: "Stronger X-ray bursts can trigger shortwave radio fadeouts on the dayside.",
        tone: "alert",
      });
    } else if (flareClass && flareClass.startsWith("C")) {
      items.push({
        title: `${flareClass}-class flare`,
        detail: "Minor flare activity with limited expected impacts.",
        tone: "calm",
      });
    }

    if (proton10 !== undefined && proton10 >= 10) {
      items.push({
        title: "Elevated proton flux",
        detail: "Radiation storm conditions are possible; spacecraft operators monitor closely.",
        tone: "watch",
      });
    }

    return items.slice(0, 5);
  }, [comprehensiveData]);

  const leadTimeMinutes = useMemo(() => {
    const velocity = comprehensiveData?.solar_wind?.velocity;
    if (!velocity || velocity <= 0) return null;

    const minutes = Math.round(1500000 / velocity / 60);
    return Math.max(5, Math.min(90, minutes));
  }, [comprehensiveData?.solar_wind?.velocity]);

  // Fetch current solar wind data (uses adaptive interval)
  const { data: currentData, isLoading: currentLoading, error: currentError } = useQuery<SolarWindReading>({
    queryKey: ["/api/solar-wind/current"],
    refetchInterval: () => updateFrequency,
    retry: false
  });

  // Fetch system status (always 30 seconds)
  const { data: systemStatus } = useQuery<SystemStatusType[]>({
    queryKey: ["/api/system/status"],
    refetchInterval: 30000
  });

  // Fetch ambient settings (uses adaptive interval)
  const { data: ambientSettings, isLoading: ambientLoading } = useQuery<AmbientSettings>({
    queryKey: ["/api/settings/ambient"],
    refetchInterval: () => updateFrequency
  });

  // Local state for controls
  const [notificationSettings, setNotificationSettings] = useState(() => getNotificationSettings());

  // Update ambient settings mutation (saves to localStorage for static site)
  const updateAmbientMutation = useMutation({
    mutationFn: async (settings: Partial<AmbientSettings & { background_mode?: string }>) => {
      // Save to localStorage
      saveAmbientSettings(settings as any);
      // Also try to save via API (for Cloudflare Functions)
      try {
        await apiRequest("POST", "/api/settings/ambient", settings);
      } catch (error) {
        // Ignore API errors, localStorage is the source of truth
        console.warn('Failed to save settings via API, using localStorage only:', error);
      }
      return new Response(JSON.stringify(settings));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/ambient"] });
      toast({
        title: "Settings Updated",
        description: "Ambient mode settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update ambient settings",
        variant: "destructive",
      });
    }
  });

  // Sync local state with fetched settings or localStorage
  useEffect(() => {
    const stored = getAmbientSettings();
    const settings = ambientSettings || stored;
    
    if (settings && typeof settings === 'object') {
      const volume = (settings as any).volume;
      const bgMode = (settings as any).background_mode;
      setAmbientVolume(typeof volume === 'number' ? volume : 0.4);
      setBackgroundMode(bgMode === undefined ? true : bgMode === "true");
    }
  }, [ambientSettings]);

  // Fetch NOAA data mutation
  const fetchDataMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/solar-wind/fetch"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/solar-wind"] });
      toast({
        title: "Data Updated",
        description: "Successfully fetched latest NOAA solar wind data",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fetch Failed",
        description: error.message || "Failed to fetch NOAA data",
        variant: "destructive",
      });
    }
  });

  // Auto-fetch data on component mount and periodically
  useEffect(() => {
    fetchDataMutation.mutate();
    // Use adaptive interval for data fetching
    const interval = setInterval(() => {
      fetchDataMutation.mutate();
    }, updateFrequency);

    return () => clearInterval(interval);
  }, [updateFrequency]);

  // Heliosinger toggle
  const handleHeliosingerToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        // First, unlock audio synchronously within the gesture (iOS)
        await heliosinger.unlock();

        // Reflect UI state
        setIsHeliosingerEnabled(true);

        // Start audio if we have data available now; otherwise hook will start once data arrives
        if (!heliosinger.isSinging && comprehensiveData) {
          console.log("Starting Heliosinger on user interaction...");
          await heliosinger.start();
          console.log("Heliosinger started successfully");
          
          // Verify audio is actually playing
          setTimeout(() => {
            if (heliosinger.isSinging) {
              console.log("✅ Heliosinger is singing");
            } else {
              console.warn("⚠️ Heliosinger state says singing but may not be audible");
            }
          }, 500);
        }
        console.log("Heliosinger mode enabled - the sun will sing");
      } catch (error) {
        console.error("Failed to start Heliosinger:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not start Heliosinger audio.";
        toast({
          title: "Heliosinger Failed",
          description: `${errorMessage} On iOS, make sure your device is not on silent mode and volume is up.`,
          variant: "destructive",
        });
        setIsHeliosingerEnabled(false);
        return;
      }
    } else {
      setIsHeliosingerEnabled(false);
      // Explicitly stop audio
      if (heliosinger.isSinging) {
        heliosinger.stop();
      }
      console.log("Heliosinger mode disabled");
    }

    updateAmbientMutation.mutate({
      enabled: enabled ? "true" : "false",
      volume: ambientVolume,
      smoothing: 0.8,
      max_rate: 10.0,
      battery_min: 20.0
    });
  };

  // Fallback: ensure unlock/start on user interaction (matches stream behavior, helps iOS)
  useEffect(() => {
    const startAudio = async () => {
      if (!isHeliosingerEnabled) return;
      try {
        await heliosinger.unlock();
        if (!heliosinger.isSinging && comprehensiveData) {
          await heliosinger.start();
        }
      } catch (e) {
        console.warn("Dashboard unlock/start fallback failed", e);
      }
    };

    // Try once on mount
    startAudio();

    const unlockHandler = () => {
      startAudio();
      document.removeEventListener('click', unlockHandler);
    };
    document.addEventListener('click', unlockHandler);

    return () => {
      document.removeEventListener('click', unlockHandler);
    };
  }, [heliosinger, isHeliosingerEnabled, comprehensiveData]);


  // Volume change handler
  // Accepts either array (from desktop slider) or number (from mobile player)
  const handleVolumeChange = (value: number[] | number) => {
    const newVolume = Array.isArray(value) ? value[0] : value;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    
    setAmbientVolume(clampedVolume);
    
    if (isHeliosingerEnabled) {
      heliosinger.setVolume(clampedVolume);
    }
    
    if (isHeliosingerEnabled) {
      setTimeout(() => {
        updateAmbientMutation.mutate({
          volume: clampedVolume,
          enabled: "true"
        });
      }, 500);
    }
  };

  const isDataStreamActive = Array.isArray(systemStatus) && systemStatus.find((s: any) => s.component === 'data_stream')?.status === 'active';

  if (currentError && !currentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4">
              <i className="fas fa-exclamation-triangle text-4xl mb-2" />
              <h2 className="text-xl font-bold">Data Connection Error</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Unable to connect to solar wind data stream. The NOAA DSCOVR service may be temporarily unavailable.
            </p>
            <Button 
              onClick={() => fetchDataMutation.mutate()}
              disabled={fetchDataMutation.isPending}
              data-testid="button-retry-fetch"
            >
              <i className="fas fa-refresh mr-2" />
              {fetchDataMutation.isPending ? "Retrying..." : "Retry Connection"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Generate comprehensive song description for screen readers
  const generateSongDescription = (): string => {
    if (!heliosinger.currentData) {
      return 'Heliosinger is currently silent. Enable it to hear the sun sing.';
    }

    const data = heliosinger.currentData;
    const vowel = data.currentVowel;
    const chordQuality = getChordQuality(
      data.condition,
      data.chordVoicing,
      comprehensiveData?.solar_wind?.temperature,
      data.density,
      comprehensiveData?.solar_wind?.bz,
      data.kIndex
    );
    
    // Describe rhythm/tremolo
    let rhythmDesc = 'steady';
    const kIndex = data.kIndex ?? 0;
    if (kIndex >= 7) {
      rhythmDesc = 'intense, chaotic tremolo';
    } else if (kIndex >= 5) {
      rhythmDesc = 'fast pulsing tremolo';
    } else if (kIndex >= 3) {
      rhythmDesc = 'moderate tremolo';
    }

    return `The Sun is singing an ${vowel.openness > 0.6 ? 'open' : vowel.openness < 0.4 ? 'closed' : 'mid'} '${vowel.displayName}' (${vowel.ipaSymbol}) at ${data.frequency.toFixed(0)} Hz (${data.baseNote}) with ${rhythmDesc}, in a ${chordQuality.name.toLowerCase()} chord, reflecting ${data.condition} solar conditions. ${data.vowelDescription}. ${data.solarMood}.`;
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 md:pb-0 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-5 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:24px_24px]" />
      {/* ARIA Live Region for Dynamic Updates */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        key={heliosinger.currentData ? `${heliosinger.currentData.frequency}-${heliosinger.currentData.currentVowel.name}` : 'silent'}
      >
        {generateSongDescription()}
      </div>

      {/* Navigation Header */}
      <nav 
        className="border-b-4 border-primary bg-black/95 sticky top-0 z-50 backdrop-blur"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BrutalistLogo className="h-10" />
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-primary text-black px-4 py-2 border-2 border-black -skew-x-6 shadow-[4px_4px_0px_rgba(0,0,0,0.6)]">
                <div className={`w-3 h-3 ${isDataStreamActive ? 'bg-black animate-pulse' : 'bg-destructive'}`} />
                <span className="text-sm font-black uppercase tracking-tight skew-x-6" data-testid="text-data-status">
                  {isDataStreamActive ? 'Live Data' : 'Offline'}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchDataMutation.mutate()}
                disabled={fetchDataMutation.isPending}
                data-testid="button-refresh-data"
                className="border-2 border-white bg-black text-white hover:bg-white hover:text-black uppercase font-black tracking-tight"
              >
                <i className={`fas fa-sync-alt ${fetchDataMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
              </Button>
              <Link href="/stream">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-white text-black border-2 border-black -skew-x-6 font-black uppercase tracking-widest hover:bg-primary hover:text-black shadow-[4px_4px_0px_rgba(0,0,0,0.6)]"
                >
                  <span className="skew-x-6">Fullscreen Stream</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main id="main" className="container mx-auto px-4 py-8 relative z-10">
        {/* Hero Section */}
        <section className="mb-12 text-center relative">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 blur-3xl" />
          <div className="flex justify-center mb-6">
            <BrutalistLogo className="scale-150 shadow-[6px_6px_0px_rgba(0,0,0,0.5)]" />
          </div>
          <h1 className="text-4xl font-black mb-2 text-white uppercase tracking-tighter -skew-x-6 inline-block px-4 py-2 border-4 border-white/30 shadow-[6px_6px_0px_rgba(0,0,0,0.6)] bg-black/70">
            Real-Time Space Weather Sonification
          </h1>
          <p className="text-sm text-white/80 max-w-2xl mx-auto border-l-4 border-primary pl-4 text-left font-mono">
            Experience space weather as the sun literally sings its story in real-time. 
            Each moment creates a unique vowel sound, pitch, and rhythm based on solar wind conditions.
          </p>
        </section>

        {/* Data-driven 3D solar hologram */}
        <div className="mb-10">
          <Suspense fallback={<div className="w-full h-[320px] bg-black animate-pulse flex items-center justify-center"><span className="text-primary/50 font-mono">Loading visualization...</span></div>}>
            <SolarHologram
              data={comprehensiveData}
              heliosingerData={heliosinger.currentData}
              isPlaying={isHeliosingerEnabled && heliosinger.isSinging}
            />
          </Suspense>
        </div>


        {/* Recent Events Ticker */}
        {comprehensiveData && (
          <div className="mb-6">
            <EventsTicker 
              currentData={comprehensiveData} 
              previousData={previousComprehensiveDataRef.current}
            />
          </div>
        )}

        {/* Heliosinger Mode Controls - Moved to Top */}
        <section className="mb-8">
          <Card className="bg-card border-4 border-primary shadow-none" aria-busy={comprehensiveLoading}>
            <CardHeader className="border-b-4 border-primary bg-primary text-primary-foreground">
              <CardTitle className="flex items-center uppercase font-black tracking-tighter text-2xl">
                <div className={`w-4 h-4 mr-3 border-2 border-black ${isHeliosingerEnabled ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
                Heliosinger Mode
                <Badge variant={isHeliosingerEnabled ? "default" : "secondary"} className="ml-auto border-2 border-black rounded-none text-lg">
                  {isHeliosingerEnabled ? "SINGING" : "SILENT"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between border-b-2 border-border pb-4">
                <div className="space-y-1">
                  <Label htmlFor="heliosinger-toggle" className="text-lg font-bold uppercase">
                    Let the Sun Sing
                  </Label>
                  <p id="heliosinger-description" className="text-sm text-muted-foreground font-mono">
                    The sun literally sings space weather using vowel sounds and harmonic synthesis
                  </p>
                </div>
                <Switch
                  id="heliosinger-toggle"
                  checked={isHeliosingerEnabled}
                  onPointerDown={async () => { try { await heliosinger.unlock(); } catch (e) { console.warn('Pre-unlock failed:', e); } }}
                  onCheckedChange={handleHeliosingerToggle}
                  disabled={!comprehensiveData || ambientLoading}
                  data-testid="switch-heliosinger-toggle"
                  aria-label="Enable Heliosinger mode to hear the sun sing space weather"
                  aria-describedby="heliosinger-description"
                  className="scale-125"
                />
              </div>

              {/* Volume Control */}
              <div className="space-y-2 border-b-2 border-border pb-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold uppercase">
                    Solar Volume
                  </Label>
                  <span className="text-sm font-mono bg-secondary px-2 py-1" data-testid="text-ambient-volume">
                    {Math.round(ambientVolume * 100)}%
                  </span>
                </div>
                <Slider
                  value={[ambientVolume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.01}
                  className="w-full"
                  disabled={!isHeliosingerEnabled}
                  data-testid="slider-ambient-volume"
                  aria-label="Solar volume control"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(ambientVolume * 100)}
                />
              </div>

              {/* Background Mode Toggle */}
              <div className="flex items-center justify-between border-b-2 border-border pb-4">
                <div className="space-y-1">
                  <Label htmlFor="background-mode-toggle" className="text-sm font-bold uppercase">
                    Background Mode
                  </Label>
                  <p className="text-xs text-muted-foreground font-mono">
                    Continue playing when tab is hidden (like background music)
                  </p>
                </div>
                <Switch
                  id="background-mode-toggle"
                  checked={backgroundMode}
                  onCheckedChange={(checked) => {
                    setBackgroundMode(checked);
                    updateAmbientMutation.mutate({
                      background_mode: checked ? "true" : "false"
                    });
                  }}
                  disabled={!isHeliosingerEnabled}
                  data-testid="switch-background-mode"
                />
              </div>

              {/* Current Vowel Display with Mini Chart */}
              {heliosinger.currentData && (
                <SonificationTrainer 
                  currentData={heliosinger.currentData}
                  comprehensiveData={comprehensiveData}
                />
              )}

              {/* Status and Information */}
              <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Audio Status:</span>
                  <span className={`font-medium ${isHeliosingerEnabled ? 'text-accent' : 'text-muted-foreground'}`} data-testid="text-audio-status">
                    {isHeliosingerEnabled ? 'Singing' : 'Silent'}
                  </span>
                </div>
                
                {backgroundMode && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Background Mode:</span>
                    <Badge variant="default" className="text-xs">
                      Active
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Update Frequency:</span>
                  <span className="font-mono text-xs" data-testid="text-update-frequency">
                    {getUpdateFrequencyDescription(updateFrequency)}
                  </span>
                </div>
                
                {heliosinger.currentData && (
                  <>
                    {/* Chord Information - Consolidated */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Chord:</span>
                        <div className="flex gap-1 flex-wrap justify-end max-w-[60%]">
                          {heliosinger.currentData.chordVoicing.map((tone, i) => (
                            <Badge 
                              key={i} 
                              variant={i === 0 ? "default" : "outline"} 
                              className="text-xs font-mono"
                              title={`${tone.noteName} (${tone.frequency.toFixed(1)} Hz)`}
                            >
                              {tone.noteName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {(() => {
                        const chordQuality = getChordQuality(
                          heliosinger.currentData.condition,
                          heliosinger.currentData.chordVoicing,
                          comprehensiveData?.solar_wind?.temperature,
                          heliosinger.currentData.density,
                          comprehensiveData?.solar_wind?.bz,
                          heliosinger.currentData.kIndex
                        );
                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Quality:</span>
                              <Badge variant="outline" className="text-xs font-semibold">
                                {chordQuality.name} ({chordQuality.symbol})
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground italic text-right">
                              {chordQuality.description}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Condition Badge */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Condition:</span>
                      <Badge variant={heliosinger.currentData.condition === 'extreme' ? 'destructive' : 
                                     heliosinger.currentData.condition === 'storm' ? 'secondary' : 'default'}
                             className="text-xs">
                        {String(heliosinger.currentData.condition)}
                      </Badge>
                    </div>
                  </>
                )}
                
                {!heliosinger.currentData && (
                  <div className="text-xs text-muted-foreground italic text-right">
                    Heliosinger telemetry unavailable — enable to hear live mapping.
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </section>

        {/* Space Weather Implications + Live Narrator */}
        <section className="mb-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-4 border-primary bg-black/80 shadow-[8px_8px_0px_rgba(0,0,0,0.6)]">
            <CardHeader className="bg-primary text-black border-b-4 border-black skew-x-3">
              <CardTitle className="flex items-center gap-3 -skew-x-3 uppercase tracking-widest font-black text-xl">
                <i className="fas fa-satellite-dish text-black" />
                Space Weather Implications
                <Badge variant="secondary" className="ml-auto bg-black text-white border-2 border-black rounded-none">
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {leadTimeMinutes && comprehensiveData?.solar_wind?.velocity ? (
                <div className="text-[11px] text-white/70 uppercase tracking-widest">
                  L1 lead time: ~{leadTimeMinutes} min at {comprehensiveData.solar_wind.velocity.toFixed(0)} km/s
                </div>
              ) : null}
              {implications.length > 0 ? (
                <div className="space-y-3">
                  {implications.map((implication, index) => (
                    <div
                      key={`${implication.title}-${index}`}
                      className="border-2 border-white/20 bg-black/60 px-4 py-3 -skew-x-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]"
                    >
                      <div className="skew-x-3 flex items-start gap-3">
                        <div
                          className={`mt-1 h-2.5 w-2.5 rounded-full border ${IMPLICATION_TONE_STYLES[implication.tone]}`}
                        />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-black uppercase tracking-tight text-white">
                            {implication.title}
                          </p>
                          <p className="text-xs text-white/70">{implication.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-white/60 uppercase tracking-widest">
                  Waiting for live space weather data...
                </div>
              )}
              <div className="text-[11px] text-white/50">
                Signals derived from NOAA live feeds, IMF orientation, and geomagnetic indices.
              </div>
            </CardContent>
          </Card>

          <Card className="border-4 border-primary bg-black/80 shadow-[8px_8px_0px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <CardHeader className="bg-primary text-black border-b-4 border-black skew-x-3">
              <CardTitle className="flex items-center gap-3 -skew-x-3 uppercase tracking-widest font-black text-xl">
                <i className="fas fa-bolt text-black" />
                Live Narrator
                <Badge variant="secondary" className="ml-auto bg-black text-white border-2 border-black rounded-none">
                  Auto
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="relative p-6">
              <div className="relative min-h-[260px]">
                <EducationalInsight narratorState={narrator.state} />
                {!narrator.isShowingInsight && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-white/60 uppercase tracking-widest">
                    Generating next insight...
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] text-white/50 uppercase tracking-widest">
                <span>Queue: {narrator.queueLength}</span>
                <span>Update: {getUpdateFrequencyDescription(updateFrequency)}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Notification Settings */}
        {isNotificationSupported() && (
          <section className="mb-8">
            <Card className="border-4 border-primary bg-black relative overflow-hidden shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:22px_22px]" />
              <CardHeader className="bg-primary text-black border-b-4 border-black skew-x-3">
                <CardTitle className="flex items-center gap-3 -skew-x-3 uppercase tracking-widest font-black text-xl">
                  <i className="fas fa-bell text-black" />
                  Alert System
                  {!canSendNotifications() && (
                    <Badge variant="secondary" className="ml-auto bg-black text-white border-2 border-black rounded-none">
                      Permission Needed
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-4 p-6">
                {!canSendNotifications() && (
                  <div className="bg-black/80 text-white border-2 border-primary px-4 py-3 -skew-x-3 shadow-[6px_6px_0px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-3 skew-x-3">
                      <i className="fas fa-bolt text-primary" />
                      <div>
                        <p className="text-sm font-bold uppercase tracking-tight">Enable Atlus Alerts</p>
                        <p className="text-xs text-white/70">Get dramatic pop-in alerts when storms hit.</p>
                      </div>
                      <Button
                        onClick={async () => {
                          const permission = await requestNotificationPermission();
                          if (permission === 'granted') {
                            toast({
                              title: "Notifications Enabled",
                              description: "You'll now receive alerts for significant space weather events.",
                            });
                            setNotificationSettings(getNotificationSettings());
                          } else {
                            toast({
                              title: "Permission Denied",
                              description: "Please enable notifications in your browser settings.",
                              variant: "destructive",
                            });
                          }
                        }}
                        size="sm"
                        className="ml-auto bg-white text-black font-black uppercase tracking-widest border-2 border-black hover:bg-primary hover:text-black"
                      >
                        Activate
                      </Button>
                    </div>
                  </div>
                )}

                {canSendNotifications() && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between bg-white text-black px-4 py-3 -skew-x-3 border-2 border-black shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
                      <div className="space-y-1 skew-x-3">
                        <p className="text-xs font-black uppercase tracking-widest">Global Alerts</p>
                        <p className="text-[11px] opacity-70">High-contrast flashes when thresholds trip.</p>
                      </div>
                      <Switch
                        id="notifications-enabled"
                        checked={notificationSettings.enabled}
                        onCheckedChange={(checked) => {
                          const updated = { ...notificationSettings, enabled: checked };
                          setNotificationSettings(updated);
                          saveNotificationSettings(updated);
                        }}
                      />
                    </div>

                    {notificationSettings.enabled && (
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="bg-black/80 text-white border-2 border-primary p-3 -skew-x-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                          <div className="skew-x-3 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase font-black tracking-widest">Kp Spikes</p>
                              <p className="text-[10px] text-white/70">Stormfront flashes</p>
                            </div>
                            <Switch
                              id="notify-kp"
                              checked={notificationSettings.kpThresholds}
                              onCheckedChange={(checked) => {
                                const updated = { ...notificationSettings, kpThresholds: checked };
                                setNotificationSettings(updated);
                                saveNotificationSettings(updated);
                              }}
                            />
                          </div>
                        </div>

                        <div className="bg-white text-black border-2 border-black p-3 -skew-x-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                          <div className="skew-x-3 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase font-black tracking-widest">Bz Swings</p>
                              <p className="text-[10px] text-black/70">Southward alarms</p>
                            </div>
                            <Switch
                              id="notify-bz"
                              checked={notificationSettings.bzEvents}
                              onCheckedChange={(checked) => {
                                const updated = { ...notificationSettings, bzEvents: checked };
                                setNotificationSettings(updated);
                                saveNotificationSettings(updated);
                              }}
                            />
                          </div>
                        </div>

                        <div className="bg-destructive text-white border-2 border-black p-3 -skew-x-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                          <div className="skew-x-3 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase font-black tracking-widest">Density Jumps</p>
                              <p className="text-[10px] text-white/80">Plasma surge pings</p>
                            </div>
                            <Switch
                              id="notify-density"
                              checked={notificationSettings.densityAlerts ?? false}
                              onCheckedChange={(checked) => {
                                const updated = { ...notificationSettings, densityAlerts: checked };
                                setNotificationSettings(updated);
                                saveNotificationSettings(updated);
                              }}
                            />
                          </div>
                        </div>

                        <div className="bg-primary text-black border-2 border-black p-3 -skew-x-3 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] sm:col-span-3">
                          <div className="skew-x-3 flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase font-black tracking-widest">Sound Notifications</p>
                              <p className="text-[10px] text-black/70">Cues sync with vocalizer</p>
                            </div>
                            <Switch
                              id="notify-sound"
                              checked={notificationSettings.soundEnabled}
                              onCheckedChange={(checked) => {
                                const updated = { ...notificationSettings, soundEnabled: checked };
                                setNotificationSettings(updated);
                                saveNotificationSettings(updated);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Space Weather Examples - What You're Listening For */}
        {/* <section className="mb-8">
          <SpaceWeatherExamples />
        </section> */}

        {/* Educational Guide */}
        {/* <section className="mb-8">
          <HeliosingerGuide />
        </section> */}

        {/* Data Dashboard */}
        <section className="mb-10">
          <DataDashboard />
        </section>

        {/* System Status */}
        <section className="mb-10">
          <div className="border-4 border-primary bg-black/80 shadow-[8px_8px_0px_rgba(0,0,0,0.6)]">
            <div className="px-4 py-3 border-b-4 border-white/20 bg-primary text-black -skew-x-6">
              <h3 className="font-black uppercase tracking-widest text-lg skew-x-6">System Status</h3>
            </div>
            <div className="p-4">
              <SystemStatus variant="atlus" showTitle={false} />
            </div>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </main>

      {/* Mobile Player Widget */}
      <MobilePlayer
        isEnabled={isHeliosingerEnabled}
        isPlaying={isHeliosingerEnabled && heliosinger.isSinging}
        volume={ambientVolume}
        currentData={heliosinger.currentData}
        onToggle={handleHeliosingerToggle}
        onVolumeChange={handleVolumeChange}
      />
    </div>
  );
}

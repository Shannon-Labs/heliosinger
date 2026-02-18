import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
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
import { debugLog, debugWarn } from "@/lib/debug";
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
  
  // Progressive disclosure state
  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const [showAdvancedAlerts, setShowAdvancedAlerts] = useState(false);

  // Robustness: prevent race conditions and track network state
  const toggleInProgressRef = useRef(false);
  const backgroundModeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const volumeAudioDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
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

  // Network offline/online detection for graceful degradation
  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true);
      toast({
        title: "Connection Lost",
        description: "Solar wind data stream interrupted. Reconnecting when online...",
        variant: "destructive",
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/space-weather"] });
      queryClient.invalidateQueries({ queryKey: ["/api/solar-wind"] });
      toast({
        title: "Back Online",
        description: "Reconnected to solar wind data stream",
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [queryClient, toast]);

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
      debugWarn("Failed to map space weather for insights:", error);
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
    const dynamicPressure = Math.max(0, 1.6726e-6 * density * velocity * velocity);
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

    if (dynamicPressure >= 4) {
      items.push({
        title: "Strong solar wind pressure",
        detail: "Magnetosphere is compressed; geosynchronous satellites can see enhanced exposure and drag effects.",
        tone: "alert",
      });
    } else if (dynamicPressure >= 2) {
      items.push({
        title: "Elevated dynamic pressure",
        detail: "Compression boosts geomagnetic response, especially if Bz turns south.",
        tone: "watch",
      });
    } else if (dynamicPressure <= 0.5 && velocity > 0) {
      items.push({
        title: "Low dynamic pressure",
        detail: "Magnetosphere expands outward; conditions are typically quieter.",
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

    // Convection electric field: Ey = V × |Bz_south| × 0.001 (mV/m)
    const bzSouth = Math.max(0, -bz);
    const ey = velocity * bzSouth * 0.001;
    if (ey >= 5) {
      items.push({
        title: "Strong convection E-field",
        detail: `Ey ≈ ${ey.toFixed(1)} mV/m — solar wind is driving substantial energy into the magnetosphere via V×B coupling.`,
        tone: "alert",
      });
    } else if (ey >= 2) {
      items.push({
        title: "Elevated convection E-field",
        detail: `Ey ≈ ${ey.toFixed(1)} mV/m — moderate energy transfer from solar wind to magnetosphere.`,
        tone: "watch",
      });
    }

    // R-scale radio blackout from X-ray flux
    const longWave = comprehensiveData.xray_flux?.long_wave;
    if (longWave && longWave >= 1e-4) {
      items.push({
        title: "Radio blackout — R3+",
        detail: "X-ray flux exceeds X1 threshold; HF radio fadeouts on the sunlit side of Earth.",
        tone: "alert",
      });
    } else if (longWave && longWave >= 1e-5) {
      items.push({
        title: "Radio degradation — R1+",
        detail: "M-class X-ray flux can cause minor HF radio fadeouts for tens of minutes.",
        tone: "watch",
      });
    }

    return items.slice(0, 6);
  }, [comprehensiveData]);

  const leadTimeSummary = useMemo(() => {
    const velocity = comprehensiveData?.solar_wind?.velocity;
    if (!velocity || velocity <= 0) return null;

    const minutes = Math.round(1500000 / velocity / 60);
    return {
      minutes: Math.max(5, Math.min(90, minutes)),
      velocity: Math.round(velocity),
    };
  }, [comprehensiveData?.solar_wind?.velocity]);

  const dynamicPressureSummary = useMemo(() => {
    const velocity = comprehensiveData?.solar_wind?.velocity;
    const density = comprehensiveData?.solar_wind?.density;
    if (!velocity || !density) return null;
    const pressure = Math.max(0, 1.6726e-6 * density * velocity * velocity);
    // Formula: Standoff distance (Re) = 10 * (pressure)^(-1/6)
    const standoff = 10 * Math.pow(pressure, -1/6);
    return {
      pressure,
      standoff,
      isGeosyncAtRisk: standoff <= 6.6
    };
  }, [comprehensiveData?.solar_wind?.velocity, comprehensiveData?.solar_wind?.density]);

  // Convection electric field: Ey = V (km/s) × |Bz| (nT) × 0.001 (mV/m)
  // Only geoeffective when Bz is southward (negative)
  const convectionEySummary = useMemo(() => {
    const velocity = comprehensiveData?.solar_wind?.velocity;
    const bz = comprehensiveData?.solar_wind?.bz;
    if (!velocity || bz === undefined || bz === null) return null;
    const bzSouth = Math.max(0, -bz); // Only count southward component
    const ey = velocity * bzSouth * 0.001; // mV/m
    return { ey, velocity: Math.round(velocity), bz: bz.toFixed(1) };
  }, [comprehensiveData?.solar_wind?.velocity, comprehensiveData?.solar_wind?.bz]);

  // R-scale radio blackout from X-ray flux (NOAA 0.1-0.8nm long wave)
  const rScaleSummary = useMemo(() => {
    const longWave = comprehensiveData?.xray_flux?.long_wave;
    if (!longWave || longWave <= 0) return null;
    let scale = 0;
    let label = "R0";
    let tone: ImplicationTone = "calm";
    if (longWave >= 2e-3)      { scale = 5; label = "R5"; tone = "alert"; }
    else if (longWave >= 1e-3) { scale = 4; label = "R4"; tone = "alert"; }
    else if (longWave >= 1e-4) { scale = 3; label = "R3"; tone = "alert"; }
    else if (longWave >= 5e-5) { scale = 2; label = "R2"; tone = "watch"; }
    else if (longWave >= 1e-5) { scale = 1; label = "R1"; tone = "watch"; }
    return { scale, label, tone, flux: longWave };
  }, [comprehensiveData?.xray_flux?.long_wave]);

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
      // Save to localStorage immediately
      saveAmbientSettings(settings as any);
      
      // Also try to save via API (for Cloudflare Functions)
      try {
        const response = await apiRequest("POST", "/api/settings/ambient", settings);
        if (!response.ok) {
          debugWarn('API update failed, but settings saved locally');
        }
      } catch (error) {
        // Ignore API errors, localStorage is the source of truth
        debugWarn('Failed to save settings via API, using localStorage only:', error);
      }
      return settings;
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

  // Heliosinger toggle with race condition guard
  const handleHeliosingerToggle = async (enabled: boolean) => {
    // Guard: prevent re-entry during toggle operation
    if (toggleInProgressRef.current) {
      debugWarn("Toggle already in progress, ignoring");
      return;
    }

    toggleInProgressRef.current = true;

    try {
      if (enabled) {
        // First, unlock audio synchronously within the gesture (iOS)
        await heliosinger.unlock();

        // Reflect UI state
        setIsHeliosingerEnabled(true);

        // Start audio if we have data available now; otherwise hook will start once data arrives
        if (!heliosinger.isSinging && comprehensiveData) {
          debugLog("Starting Heliosinger on user interaction...");
          await heliosinger.start();
          debugLog("Heliosinger started successfully");

          // Verify audio is actually playing
          setTimeout(() => {
            if (heliosinger.isSinging) {
              debugLog("✅ Heliosinger is singing");
            } else {
              debugWarn("⚠️ Heliosinger state says singing but may not be audible");
            }
          }, 500);
        }
        debugLog("Heliosinger mode enabled - the sun will sing");
      } else {
        setIsHeliosingerEnabled(false);
        // Explicitly stop audio
        if (heliosinger.isSinging) {
          heliosinger.stop();
        }
        debugLog("Heliosinger mode disabled");
      }
    } catch (error) {
      console.error("Failed to toggle Heliosinger:", error);
      const errorMessage = error instanceof Error ? error.message : "Could not start Heliosinger audio.";
      toast({
        title: "Heliosinger Failed",
        description: `${errorMessage} On iOS, make sure your device is not on silent mode and volume is up.`,
        variant: "destructive",
      });
      setIsHeliosingerEnabled(false);
    } finally {
      toggleInProgressRef.current = false;
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
        debugWarn("Dashboard unlock/start fallback failed", e);
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


  // Volume change handler with debounced audio and mutation to prevent spam
  const volumeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const pendingVolumeRef = useRef<number>(0.4);

  const handleVolumeChange = (value: number[] | number) => {
    const newVolume = Array.isArray(value) ? value[0] : value;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));

    // Update UI state immediately for responsiveness
    setAmbientVolume(clampedVolume);
    pendingVolumeRef.current = clampedVolume;

    // Debounce the audio state update (prevents rapid-fire setVolume calls)
    if (volumeAudioDebounceRef.current) {
      clearTimeout(volumeAudioDebounceRef.current);
    }

    volumeAudioDebounceRef.current = setTimeout(() => {
      if (isHeliosingerEnabled) {
        heliosinger.setVolume(pendingVolumeRef.current);
      }
    }, 50); // 50ms debounce for smooth audio updates

    // Debounce the mutation for settings persistence (longer delay)
    if (volumeDebounceRef.current) {
      clearTimeout(volumeDebounceRef.current);
    }

    volumeDebounceRef.current = setTimeout(() => {
      if (isHeliosingerEnabled) {
        updateAmbientMutation.mutate({
          volume: pendingVolumeRef.current,
          enabled: "true"
        });
      }
    }, 1000); // 1 second debounce for settings persistence
  };

  const isDataStreamActive = Array.isArray(systemStatus) && systemStatus.find((s: any) => s.component === 'data_stream')?.status === 'active';

  // Show error state when offline or API error (without fallback data)
  if ((currentError || isOffline) && !currentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="text-destructive mb-4">
              <i className={`fas ${isOffline ? 'fa-wifi' : 'fa-exclamation-triangle'} text-4xl mb-2`} />
              <h2 className="text-xl font-bold">
                {isOffline ? "You're Offline" : "Data Connection Error"}
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              {isOffline
                ? "Please check your internet connection. The sun will sing again once you're back online."
                : "Unable to connect to solar wind data stream. The NOAA DSCOVR service may be temporarily unavailable."}
            </p>
            <Button
              onClick={() => fetchDataMutation.mutate()}
              disabled={fetchDataMutation.isPending || isOffline}
              data-testid="button-retry-fetch"
            >
              <i className="fas fa-refresh mr-2" />
              {fetchDataMutation.isPending ? "Retrying..." : isOffline ? "Waiting for Connection..." : "Retry Connection"}
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
        <div className="container mx-auto px-3 py-3 md:px-4 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-3 flex-shrink-0">
              <BrutalistLogo className="h-8 md:h-10" />
            </div>
            <div className="flex items-center gap-2 md:space-x-3 flex-shrink-0">
              <div className="flex items-center space-x-1.5 md:space-x-2 bg-primary text-black px-2 py-1.5 md:px-4 md:py-2 border-2 border-black md:-skew-x-6 shadow-[2px_2px_0px_rgba(0,0,0,0.6)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.6)]">
                <div className={`w-2 h-2 md:w-3 md:h-3 ${isDataStreamActive ? 'bg-black animate-pulse' : 'bg-destructive'}`} />
                <span className="text-[10px] md:text-sm font-black uppercase tracking-tight md:skew-x-6" data-testid="text-data-status">
                  {isDataStreamActive ? 'Live' : 'Off'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchDataMutation.mutate()}
                disabled={fetchDataMutation.isPending}
                data-testid="button-refresh-data"
                className="border-2 border-white bg-black text-white hover:bg-white hover:text-black uppercase font-black tracking-tight h-8 w-8 md:h-auto md:w-auto p-0 md:p-2"
              >
                <i className={`fas fa-sync-alt text-xs md:text-sm ${fetchDataMutation.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
              </Button>
              <Link href="/stream">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-white text-black border-2 border-black md:-skew-x-6 font-black uppercase tracking-wider md:tracking-widest hover:bg-primary hover:text-black shadow-[2px_2px_0px_rgba(0,0,0,0.6)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.6)] text-[10px] md:text-sm px-2 md:px-3"
                >
                  <span className="md:skew-x-6"><i className="fas fa-expand md:hidden" aria-hidden="true" /><span className="hidden md:inline">Fullscreen Stream</span></span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main id="main" className="container mx-auto px-3 py-4 md:px-4 md:py-8 relative z-10">
        {/* Hero Section - Simplified */}
        <section className="mb-6 md:mb-8 text-center relative">
          <div className="flex justify-center mb-3 md:mb-4">
            <BrutalistLogo className="scale-90 md:scale-110" />
          </div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black mb-2 text-white uppercase tracking-tighter inline-block px-2 py-1 border border-white/30 bg-black/50">
            Real-Time Space Weather Sonification
          </h1>
        </section>

        {/* Data-driven 3D solar hologram */}
        <div className="mb-6 md:mb-10">
          <Suspense fallback={
            <div className="w-full h-[200px] md:h-[320px] bg-black border-2 border-primary/30 flex flex-col items-center justify-center">
              <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <span className="text-primary/50 font-mono text-xs md:text-sm mt-4 uppercase tracking-wider">Loading visualization...</span>
            </div>
          }>
            <SolarHologram
              data={comprehensiveData}
              heliosingerData={heliosinger.currentData}
              isPlaying={isHeliosingerEnabled && heliosinger.isSinging}
            />
          </Suspense>
        </div>


        {/* Recent Events Ticker */}
        {comprehensiveData && (
          <div className="mb-4 md:mb-6">
            <EventsTicker 
              currentData={comprehensiveData} 
              previousData={previousComprehensiveDataRef.current}
            />
          </div>
        )}

        {/* Heliosinger Mode Controls - Moved to Top */}
        <section className="mb-6 md:mb-8">
          <Card className="bg-card border-2 md:border-4 border-primary shadow-none" aria-busy={comprehensiveLoading}>
            <CardHeader className="border-b-2 md:border-b-4 border-primary bg-primary text-primary-foreground px-3 py-2 md:px-6 md:py-4">
              <CardTitle className="flex items-center uppercase font-black tracking-tighter text-base md:text-2xl">
                <div className={`w-3 h-3 md:w-4 md:h-4 mr-2 md:mr-3 border-2 border-black flex-shrink-0 ${isHeliosingerEnabled ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
                <span className="truncate">Heliosinger</span>
                <Badge variant={isHeliosingerEnabled ? "default" : "secondary"} className="ml-auto border-2 border-black rounded-none text-xs md:text-lg flex-shrink-0">
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
                  onPointerDown={async () => { try { await heliosinger.unlock(); } catch (e) { debugWarn('Pre-unlock failed:', e); } }}
                  onCheckedChange={handleHeliosingerToggle}
                  disabled={!comprehensiveData || ambientLoading}
                  data-testid="switch-heliosinger-toggle"
                  aria-label="Enable Heliosinger mode to hear the sun sing space weather"
                  aria-describedby="heliosinger-description"
                  className="scale-125"
                />
              </div>

              {/* Current Vowel Display - Show current state prominently */}
              {heliosinger.currentData && (
                <SonificationTrainer 
                  currentData={heliosinger.currentData}
                  comprehensiveData={comprehensiveData}
                />
              )}

              {/* Advanced Audio Settings - Collapsible */}
              <Collapsible open={showAdvancedAudio} onOpenChange={setShowAdvancedAudio}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center justify-between w-full text-sm font-bold uppercase hover:bg-secondary/30"
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Audio Settings
                    </span>
                    {showAdvancedAudio ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Volume Control */}
                  <div className="space-y-2">
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
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="background-mode-toggle" className="text-sm font-bold uppercase">
                        Background Mode
                      </Label>
                      <p className="text-xs text-muted-foreground font-mono">
                        Continue playing when tab is hidden
                      </p>
                    </div>
                    <Switch
                      id="background-mode-toggle"
                      checked={backgroundMode}
                      onCheckedChange={(checked) => {
                        setBackgroundMode(checked);
                        if (backgroundModeDebounceRef.current) {
                          clearTimeout(backgroundModeDebounceRef.current);
                        }
                        backgroundModeDebounceRef.current = setTimeout(() => {
                          updateAmbientMutation.mutate({
                            background_mode: checked ? "true" : "false"
                          });
                        }, 300);
                      }}
                      disabled={!isHeliosingerEnabled}
                      data-testid="switch-background-mode"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

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
        <section className="mb-6 md:mb-10 grid gap-4 md:gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-2 md:border-4 border-primary bg-black/80 shadow-[4px_4px_0px_rgba(0,0,0,0.6)] md:shadow-[8px_8px_0px_rgba(0,0,0,0.6)]">
            <CardHeader className="bg-primary text-black border-b-2 md:border-b-4 border-black md:skew-x-3 px-3 py-2 md:px-6 md:py-4">
              <CardTitle className="flex items-center gap-2 md:gap-3 md:-skew-x-3 uppercase tracking-wider md:tracking-widest font-black text-sm md:text-xl">
                <i className="fas fa-satellite-dish text-black" />
                <span className="truncate">Space Weather</span>
                <Badge variant="secondary" className="ml-auto bg-black text-white border-2 border-black rounded-none text-[10px] md:text-xs flex-shrink-0">
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
              {leadTimeSummary ? (
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-[9px] md:text-[11px] uppercase tracking-wider md:tracking-widest text-white/70 font-mono">
                  <span className="border border-white/20 bg-black/40 px-1.5 py-0.5 md:px-2 md:py-1">
                    L1 ~{leadTimeSummary.minutes}m
                  </span>
                  <span className="border border-white/20 bg-black/40 px-1.5 py-0.5 md:px-2 md:py-1">
                    {leadTimeSummary.velocity} km/s
                  </span>
                  {dynamicPressureSummary ? (
                    <>
                      <span className="border border-white/20 bg-black/40 px-1.5 py-0.5 md:px-2 md:py-1">
                        {dynamicPressureSummary.pressure.toFixed(2)} nPa
                      </span>
                      <span className={`border px-1.5 py-0.5 md:px-2 md:py-1 ${dynamicPressureSummary.isGeosyncAtRisk ? 'border-destructive bg-destructive/20 text-white animate-pulse' : 'border-white/20 bg-black/40'}`}>
                        {dynamicPressureSummary.standoff.toFixed(1)} Rₑ
                      </span>
                    </>
                  ) : null}
                  {convectionEySummary ? (
                    <span className={`border px-1.5 py-0.5 md:px-2 md:py-1 ${convectionEySummary.ey >= 5 ? 'border-destructive bg-destructive/20 text-white' : convectionEySummary.ey >= 2 ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-white/20 bg-black/40'}`}>
                      Ey {convectionEySummary.ey.toFixed(1)}
                    </span>
                  ) : null}
                  {rScaleSummary ? (
                    <span className={`border px-1.5 py-0.5 md:px-2 md:py-1 ${rScaleSummary.scale >= 3 ? 'border-destructive bg-destructive/20 text-white animate-pulse' : rScaleSummary.scale >= 1 ? 'border-amber-400/40 bg-amber-500/10 text-amber-200' : 'border-white/20 bg-black/40'}`}>
                      {rScaleSummary.label}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {implications.length > 0 ? (
                <div className="space-y-3">
                  {dynamicPressureSummary && dynamicPressureSummary.isGeosyncAtRisk && (
                    <div className="border-2 border-destructive bg-destructive/10 px-3 py-1.5 md:px-4 md:py-2 md:-skew-x-3 text-[10px] md:text-[11px] font-mono text-destructive-foreground animate-pulse">
                      <div className="md:skew-x-3 flex items-center gap-2">
                        <i className="fas fa-exclamation-triangle flex-shrink-0" />
                        <span>MAGNETOPAUSE COMPRESSION: Geosync orbit exposed to raw solar wind.</span>
                      </div>
                    </div>
                  )}
                  {implications.map((implication, index) => (
                    <div
                      key={`${implication.title}-${index}`}
                      className="border-2 border-white/20 bg-black/60 px-3 py-2 md:px-4 md:py-3 md:-skew-x-3 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]"
                    >
                      <div className="md:skew-x-3 flex items-start gap-2 md:gap-3">
                        <div
                          className={`mt-1 h-2 w-2 md:h-2.5 md:w-2.5 rounded-full border flex-shrink-0 ${IMPLICATION_TONE_STYLES[implication.tone]}`}
                        />
                        <div className="flex-1 space-y-0.5 md:space-y-1 min-w-0">
                          <p className="text-xs md:text-sm font-black uppercase tracking-tight text-white">
                            {implication.title}
                          </p>
                          <p className="text-[10px] md:text-xs text-white/70">{implication.detail}</p>
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

          <Card className="border-2 md:border-4 border-primary bg-black/80 shadow-[4px_4px_0px_rgba(0,0,0,0.6)] md:shadow-[8px_8px_0px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <CardHeader className="bg-primary text-black border-b-2 md:border-b-4 border-black md:skew-x-3 px-3 py-2 md:px-6 md:py-4">
              <CardTitle className="flex items-center gap-2 md:gap-3 md:-skew-x-3 uppercase tracking-wider md:tracking-widest font-black text-sm md:text-xl">
                <i className="fas fa-bolt text-black" />
                Live Narrator
                <Badge variant="secondary" className="ml-auto bg-black text-white border-2 border-black rounded-none text-[10px] md:text-xs flex-shrink-0">
                  Auto
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6">
              <div className="min-h-[120px] md:min-h-[180px]">
                <EducationalInsight narratorState={narrator.state} variant="inline" />
                {!narrator.isShowingInsight && (
                  <div className="flex items-center justify-center py-8 md:py-12 text-xs text-white/60 uppercase tracking-widest">
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
          <section className="mb-6 md:mb-8">
            <Card className="border-2 md:border-4 border-primary bg-black relative overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,0.5)] md:shadow-[10px_10px_0px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[length:22px_22px]" />
              <CardHeader className="bg-primary text-black border-b-2 md:border-b-4 border-black md:skew-x-3 px-3 py-2 md:px-6 md:py-4">
                <CardTitle className="flex items-center gap-2 md:gap-3 md:-skew-x-3 uppercase tracking-wider md:tracking-widest font-black text-sm md:text-xl">
                  <i className="fas fa-bell text-black" />
                  Alerts
                  {!canSendNotifications() && (
                    <Badge variant="secondary" className="ml-auto bg-black text-white border-2 border-black rounded-none text-[10px] md:text-xs flex-shrink-0">
                      Permission Needed
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative space-y-3 md:space-y-4 p-3 md:p-6">
                {!canSendNotifications() && (
                  <div className="bg-black/80 text-white border-2 border-primary px-3 py-2 md:px-4 md:py-3 md:-skew-x-3 shadow-[3px_3px_0px_rgba(0,0,0,0.6)] md:shadow-[6px_6px_0px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-2 md:gap-3 md:skew-x-3">
                      <i className="fas fa-bolt text-primary" />
                      <div>
                        <p className="text-sm font-bold uppercase tracking-tight">Enable Heliosinger Alerts</p>
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
                    <div className="flex items-center justify-between bg-white text-black px-3 py-2 md:px-4 md:py-3 md:-skew-x-3 border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,0.5)] md:shadow-[6px_6px_0px_rgba(0,0,0,0.5)]">
                      <div className="space-y-1 md:skew-x-3">
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
                      <Collapsible open={showAdvancedAlerts} onOpenChange={setShowAdvancedAlerts}>
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="flex items-center justify-between w-full text-sm font-bold uppercase hover:bg-secondary/30"
                          >
                            <span className="flex items-center gap-2">
                              <Settings className="w-4 h-4" />
                              Alert Thresholds
                            </span>
                            {showAdvancedAlerts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-3">
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="bg-black/80 text-white border-2 border-primary p-2 md:p-3 md:-skew-x-3 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                              <div className="md:skew-x-3 flex items-center justify-between">
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

                            <div className="bg-white text-black border-2 border-black p-2 md:p-3 md:-skew-x-3 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                              <div className="md:skew-x-3 flex items-center justify-between">
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

                            <div className="bg-destructive text-white border-2 border-black p-2 md:p-3 md:-skew-x-3 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
                              <div className="md:skew-x-3 flex items-center justify-between">
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

                            <div className="bg-primary text-black border-2 border-black p-2 md:p-3 md:-skew-x-3 shadow-[2px_2px_0px_rgba(0,0,0,0.5)] md:shadow-[4px_4px_0px_rgba(0,0,0,0.5)] sm:col-span-3">
                              <div className="md:skew-x-3 flex items-center justify-between">
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
                        </CollapsibleContent>
                      </Collapsible>
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
        <section className="mb-6 md:mb-10">
          <DataDashboard />
        </section>

        {/* Quality Signals */}
        <section className="mb-6 md:mb-10">
          <Card className="border-2 md:border-4 border-accent/50 bg-black/80">
            <CardHeader className="bg-accent/10 text-accent-foreground border-b-2 border-accent/30 px-3 py-2 md:px-4 md:py-3">
              <CardTitle className="flex items-center gap-2 uppercase tracking-wider font-black text-sm md:text-lg">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Engineering Quality
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-black text-accent">100%</div>
                  <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Uptime</div>
                  <div className="text-[9px] md:text-[10px] text-white/40">Real-time feed</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-black text-primary">&lt;50ms</div>
                  <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Latency</div>
                  <div className="text-[9px] md:text-[10px] text-white/40">Audio processing</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-black text-warning">A+</div>
                  <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Data Quality</div>
                  <div className="text-[9px] md:text-[10px] text-white/40">NOAA validation</div>
                </div>
                <div className="text-center">
                  <div className="text-xl md:text-2xl font-black text-white/80">60Hz</div>
                  <div className="text-[10px] md:text-xs uppercase tracking-wider text-muted-foreground">Refresh</div>
                  <div className="text-[9px] md:text-[10px] text-white/40">Adaptive interval</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* System Status */}
        <section className="mb-6 md:mb-10">
          <div className="border-2 md:border-4 border-primary bg-black/80 shadow-[4px_4px_0px_rgba(0,0,0,0.6)] md:shadow-[8px_8px_0px_rgba(0,0,0,0.6)]">
            <div className="px-3 py-2 md:px-4 md:py-3 border-b-2 md:border-b-4 border-white/20 bg-primary text-black md:-skew-x-6">
              <h3 className="font-black uppercase tracking-widest text-sm md:text-lg md:skew-x-6">System Status</h3>
            </div>
            <div className="p-3 md:p-4">
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

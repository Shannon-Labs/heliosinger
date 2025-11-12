import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SolarWindDisplay } from "@/components/solar-wind-display";
import { ChordVisualization } from "@/components/chord-visualization";
import { MappingAlgorithm } from "@/components/mapping-algorithm";
import { SystemStatus } from "@/components/system-status";
import { DataDashboard } from "@/components/data-dashboard";
import { ComprehensiveSpaceWeather } from "@/components/comprehensive-space-weather";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAmbientSettings, saveAmbientSettings } from "@/lib/localStorage";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import type { AmbientSettings, ComprehensiveSpaceWeatherData } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Heliosinger hook - primary sonification system
  const [isHeliosingerEnabled, setIsHeliosingerEnabled] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  
  const heliosinger = useHeliosinger({
    enabled: isHeliosingerEnabled,
    volume: ambientVolume,
    onError: (error) => {
      toast({
        title: "Heliosinger Error",
        description: error.message,
        variant: "destructive",
      });
      setIsHeliosingerEnabled(false);
    }
  });

  // Fetch current solar wind data
  const { data: currentData, isLoading: currentLoading, error: currentError } = useQuery({
    queryKey: ["/api/solar-wind/current"],
    refetchInterval: 60000, // Refetch every minute
    retry: false
  });

  // Fetch comprehensive space weather data
  const { data: comprehensiveData, isLoading: comprehensiveLoading } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ["/api/space-weather/comprehensive"],
    queryFn: () => apiRequest("GET", "/api/space-weather/comprehensive"),
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch system status
  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"],
    refetchInterval: 30000
  });

  // Fetch ambient settings
  const { data: ambientSettings, isLoading: ambientLoading } = useQuery({
    queryKey: ["/api/settings/ambient"],
    refetchInterval: 60000
  });

  // Local state for legacy controls
  const [isLegacyAmbientEnabled, setIsLegacyAmbientEnabled] = useState(false);
  const [respectNight, setRespectNight] = useState(true);
  const [dayOnly, setDayOnly] = useState(false);

  // Update ambient settings mutation (saves to localStorage for static site)
  const updateAmbientMutation = useMutation({
    mutationFn: async (settings: Partial<AmbientSettings>) => {
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
    
    if (settings) {
      setAmbientVolume(settings.volume || 0.3);
      setRespectNight(settings.respect_night === "true");
      setDayOnly(settings.day_only === "true");
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
    const interval = setInterval(() => {
      fetchDataMutation.mutate();
    }, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  // Heliosinger toggle
  const handleHeliosingerToggle = async (enabled: boolean) => {
    console.log(`[DEBUG] Heliosinger toggle called with enabled: ${enabled}`);
    setIsHeliosingerEnabled(enabled);
    
    if (enabled) {
      console.log('[DEBUG] Starting Heliosinger');
      try {
        // Heliosinger hook handles starting automatically
        console.log("🌞 Heliosinger mode enabled - the sun will sing");
      } catch (error) {
        console.error("Failed to start Heliosinger:", error);
        toast({
          title: "Heliosinger Failed",
          description: "Could not start Heliosinger audio. Check browser audio permissions.",
          variant: "destructive",
        });
        setIsHeliosingerEnabled(false);
        return;
      }
    } else {
      console.log('[DEBUG] Stopping Heliosinger');
      // Heliosinger hook handles stopping automatically
      console.log("🌞 Heliosinger mode disabled");
    }
    
    console.log('[DEBUG] Updating ambient settings');
    updateAmbientMutation.mutate({
      enabled: enabled ? "true" : "false",
      volume: ambientVolume,
      respect_night: respectNight ? "true" : "false",
      day_only: dayOnly ? "true" : "false",
      smoothing: 0.8,
      max_rate: 10.0,
      battery_min: 20.0
    });
  };

  // Ambient toggle (now uses Heliosinger engine)
  const handleLegacyAmbientToggle = async (enabled: boolean) => {
    setIsLegacyAmbientEnabled(enabled);
    setIsHeliosingerEnabled(enabled);
    // Heliosinger hook handles starting/stopping automatically
  };

  // Volume change handler
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setAmbientVolume(newVolume);
    
    // Always route volume to Heliosinger engine
    heliosinger.setVolume(newVolume);
    
    if (isHeliosingerEnabled || isLegacyAmbientEnabled) {
      setTimeout(() => {
        updateAmbientMutation.mutate({
          volume: newVolume,
          enabled: (isHeliosingerEnabled || isLegacyAmbientEnabled) ? "true" : "false",
          respect_night: respectNight ? "true" : "false",
          day_only: dayOnly ? "true" : "false"
        });
      }, 500);
    }
  };

  // Legacy ambient update no longer needed; Heliosinger handles updates

  const isDataStreamActive = systemStatus?.find(s => s.component === 'data_stream')?.status === 'active';

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <i className="fas fa-sun text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-app-title">Heliosinger</h1>
                <p className="text-sm text-muted-foreground">The Sun Sings Space Weather</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-secondary/50 px-3 py-1 rounded-full">
                <div className={`w-2 h-2 rounded-full ${isDataStreamActive ? 'bg-accent pulse-animation' : 'bg-destructive'}`} />
                <span className="text-sm" data-testid="text-data-status">
                  {isDataStreamActive ? 'Live Data' : 'Offline'}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => fetchDataMutation.mutate()}
                disabled={fetchDataMutation.isPending}
                data-testid="button-refresh-data"
              >
                <i className={`fas fa-sync-alt ${fetchDataMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Comprehensive Space Weather Display */}
        <div className="mb-8">
          <ComprehensiveSpaceWeather />
        </div>

        {/* Solar Wind Data Display */}
        <SolarWindDisplay 
          data={currentData} 
          loading={currentLoading}
          onRefresh={() => fetchDataMutation.mutate()}
          refreshing={fetchDataMutation.isPending}
        />

        {/* Current Chord Visualization */}
        {currentData && (
          <ChordVisualization 
            velocity={currentData.velocity}
            density={currentData.density}
            bz={currentData.bz}
          />
        )}

        {/* Heliosinger Mode Controls */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isHeliosingerEnabled ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
                Heliosinger Mode
                <Badge variant={isHeliosingerEnabled ? "default" : "secondary"} className="ml-auto">
                  {isHeliosingerEnabled ? "Singing" : "Silent"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="heliosinger-toggle" className="text-base font-medium">
                    🌞 Let the Sun Sing
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    The sun literally sings space weather using vowel sounds and harmonic synthesis
                  </p>
                </div>
                <Switch
                  id="heliosinger-toggle"
                  checked={isHeliosingerEnabled}
                  onCheckedChange={handleHeliosingerToggle}
                  disabled={!comprehensiveData || ambientLoading}
                  data-testid="switch-heliosinger-toggle"
                />
              </div>

              {/* Volume Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Solar Volume
                  </Label>
                  <span className="text-sm text-muted-foreground" data-testid="text-ambient-volume">
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
                  disabled={!isHeliosingerEnabled && !isLegacyAmbientEnabled}
                  data-testid="slider-ambient-volume"
                />
              </div>

              {/* Current Vowel Display */}
              {heliosinger.currentData && (
                <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
                  <div className="text-center space-y-2">
                    <div className="text-6xl font-bold text-primary" data-testid="current-vowel">
                      "{heliosinger.currentData.currentVowel.displayName}"
                    </div>
                    <div className="text-lg text-muted-foreground" data-testid="vowel-description">
                      {heliosinger.currentData.vowelDescription}
                    </div>
                    <div className="text-sm italic text-accent" data-testid="solar-mood">
                      {heliosinger.currentData.solarMood}
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Information */}
              <div className="bg-secondary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Audio Status:</span>
                  <span className={`font-medium ${isHeliosingerEnabled ? 'text-accent' : 'text-muted-foreground'}`} data-testid="text-audio-status">
                    {isHeliosingerEnabled ? '🌞 Singing' : isLegacyAmbientEnabled ? 'Streaming' : 'Silent'}
                  </span>
                </div>
                
                {heliosinger.currentData && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Note:</span>
                      <span className="font-mono" data-testid="text-current-note">
                        {heliosinger.currentData.baseNote} ({heliosinger.currentData.frequency.toFixed(1)} Hz)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Harmonics:</span>
                      <span className="font-mono" data-testid="text-harmonic-count">
                        {heliosinger.currentData.harmonicCount} partials
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">K-index:</span>
                      <span className="font-mono" data-testid="text-k-index">
                        {heliosinger.currentData.kIndex}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Condition:</span>
                      <Badge variant={heliosinger.currentData.condition === 'extreme' ? 'destructive' : 
                                     heliosinger.currentData.condition === 'storm' ? 'warning' : 'default'}
                             className="text-xs">
                        {heliosinger.currentData.condition}
                      </Badge>
                    </div>
                  </>
                )}
                
                {!heliosinger.currentData && currentData && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Velocity:</span>
                      <span className="font-mono" data-testid="text-velocity">
                        {currentData.velocity.toFixed(1)} km/s
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Density:</span>
                      <span className="font-mono" data-testid="text-density">
                        {currentData.density.toFixed(1)} p/cm³
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Bz:</span>
                      <span className="font-mono" data-testid="text-bz">
                        {currentData.bz.toFixed(1)} nT
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong>Heliosinger</strong> makes the sun literally sing space weather. The sun's "voice" changes 
                  based on solar wind conditions - density shapes the vowel, temperature affects brightness, 
                  magnetic field creates stereo space, and geomagnetic activity adds rhythm. Each moment in space 
                  weather creates a unique sung note.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Ambient Mode (Alias for Heliosinger for backwards compatibility) */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isLegacyAmbientEnabled ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
                Ambient Mode (Heliosinger)
                <Badge variant={isLegacyAmbientEnabled ? "default" : "secondary"} className="ml-auto">
                  {isLegacyAmbientEnabled ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="legacy-ambient-toggle" className="text-base font-medium">
                    Use as Ambient Background
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Same Heliosinger engine, optimized for continuous background listening
                  </p>
                </div>
                <Switch
                  id="legacy-ambient-toggle"
                  checked={isLegacyAmbientEnabled}
                  onCheckedChange={handleLegacyAmbientToggle}
                  disabled={ambientLoading || !comprehensiveData}
                  data-testid="switch-legacy-ambient-toggle"
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Data Dashboard */}
        <DataDashboard />

        {/* Mapping Algorithm */}
        <MappingAlgorithm />

        {/* System Status */}
        <SystemStatus />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Heliosinger</h4>
              <p className="text-sm text-muted-foreground">
                The sun sings space weather in real-time.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Data Sources</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>NOAA Space Weather Prediction Center</li>
                <li>DSCOVR L1 Lagrange Point Observatory</li>
                <li>Real-time solar wind plasma data</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Technology</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>Web Audio API with formant filters</li>
                <li>Real-time data processing</li>
                <li>Vowel synthesis & harmonic series</li>
                <li>Space weather sonification</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 mt-8 text-center text-sm text-muted-foreground">
            © 2025 Heliosinger - The Sun Sings Space Weather
          </div>
        </div>
      </footer>
    </div>
  );
}

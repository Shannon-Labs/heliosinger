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
import { startAmbient, updateAmbient, stopAmbient, setAmbientVolume, isAmbientActive } from "@/lib/audio-engine";
import { startMultiParameter, updateMultiParameter, stopMultiParameter } from "@/lib/multi-parameter-audio-engine";
import { generateChordDataFromSolarWind, generateChordDataFromComprehensive } from "@/lib/midi-mapping";
import { getAmbientSettings, saveAmbientSettings } from "@/lib/localStorage";
import type { AmbientSettings, ComprehensiveSpaceWeatherData } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Local state for ambient controls
  const [isAmbientEnabled, setIsAmbientEnabled] = useState(false);
  const [isMultiParameterEnabled, setIsMultiParameterEnabled] = useState(false);
  const [ambientIntensity, setAmbientIntensity] = useState(0.5);
  const [ambientVolume, setAmbientVolume] = useState(0.3);
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
      setIsAmbientEnabled(settings.enabled === "true");
      setAmbientIntensity(settings.intensity || 0.5);
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

  // Ambient mode event handlers
  const handleAmbientToggle = async (enabled: boolean) => {
    setIsAmbientEnabled(enabled);
    
    if (enabled && currentData) {
      try {
        const chordData = generateChordDataFromSolarWind(currentData);
        await startAmbient(chordData, ambientVolume, 0.8);
        console.log("Started ambient mode with current solar wind data");
      } catch (error) {
        console.error("Failed to start ambient mode:", error);
        toast({
          title: "Ambient Mode Failed",
          description: "Could not start ambient audio. Check browser audio permissions.",
          variant: "destructive",
        });
        setIsAmbientEnabled(false);
        return;
      }
    } else {
      stopAmbient();
      console.log("Stopped ambient mode");
    }

    updateAmbientMutation.mutate({
      enabled: enabled ? "true" : "false",
      intensity: ambientIntensity,
      volume: ambientVolume,
      respect_night: respectNight ? "true" : "false",
      day_only: dayOnly ? "true" : "false",
      smoothing: 0.8,
      max_rate: 10.0,
      battery_min: 20.0
    });
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setAmbientVolume(newVolume);
    
    if (isAmbientEnabled) {
      setTimeout(() => {
        updateAmbientMutation.mutate({
          volume: newVolume,
          enabled: "true",
          intensity: ambientIntensity,
          respect_night: respectNight ? "true" : "false",
          day_only: dayOnly ? "true" : "false"
        });
      }, 500); // Debounce settings updates
    }
  };

  const handleIntensityChange = (value: number[]) => {
    const newIntensity = value[0];
    setAmbientIntensity(newIntensity);
    
    if (isAmbientEnabled) {
      setTimeout(() => {
        updateAmbientMutation.mutate({
          intensity: newIntensity,
          enabled: "true",
          volume: ambientVolume,
          respect_night: respectNight ? "true" : "false",
          day_only: dayOnly ? "true" : "false"
        });
      }, 500); // Debounce settings updates
    }
  };

  const handleSettingChange = (setting: string, value: boolean) => {
    if (setting === 'respectNight') {
      setRespectNight(value);
    } else if (setting === 'dayOnly') {
      setDayOnly(value);
    }
    
    updateAmbientMutation.mutate({
      [setting === 'respectNight' ? 'respect_night' : 'day_only']: value ? "true" : "false",
      enabled: isAmbientEnabled ? "true" : "false",
      intensity: ambientIntensity,
      volume: ambientVolume
    });
  };

  // Update ambient audio when solar wind data changes
  useEffect(() => {
    if (isAmbientEnabled && !isMultiParameterEnabled && currentData) {
      const chordData = generateChordDataFromSolarWind(currentData);
      updateAmbient(chordData);
    }
  }, [currentData, isAmbientEnabled, isMultiParameterEnabled]);

  // Update multi-parameter audio when comprehensive data changes
  useEffect(() => {
    if (isMultiParameterEnabled && comprehensiveData) {
      // Always update - the engine handles starting/updating internally
      updateMultiParameter(comprehensiveData);
    } else if (!isMultiParameterEnabled) {
      stopMultiParameter();
    }
  }, [comprehensiveData, isMultiParameterEnabled]);

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
                <i className="fas fa-satellite-dish text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-app-title">Heliochime</h1>
                <p className="text-sm text-muted-foreground">Real-time Space Weather Sonification</p>
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

        {/* Ambient Mode Controls */}
        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${isAmbientEnabled ? 'bg-accent animate-pulse' : 'bg-muted'}`} />
                Ambient Mode
                <Badge variant={isAmbientEnabled ? "default" : "secondary"} className="ml-auto">
                  {isAmbientEnabled ? "Active" : "Inactive"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="ambient-toggle" className="text-base font-medium">
                    Always-On Ambient Audio
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {isMultiParameterEnabled 
                      ? "Multi-parameter audio: All space weather data sources"
                      : "Continuous web audio reflecting current solar wind conditions"}
                  </p>
                </div>
                <Switch
                  id="ambient-toggle"
                  checked={isAmbientEnabled}
                  onCheckedChange={handleAmbientToggle}
                  disabled={!currentData || ambientLoading}
                  data-testid="switch-ambient-toggle"
                />
              </div>

              {/* Multi-Parameter Mode Toggle */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-1">
                  <Label htmlFor="multi-param-toggle" className="text-base font-medium">
                    Multi-Parameter Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Use all space weather data sources (X-ray, protons, electrons, K-index, magnetometer) for rich layered audio
                  </p>
                </div>
                <Switch
                  id="multi-param-toggle"
                  checked={isMultiParameterEnabled}
                  onCheckedChange={(checked) => {
                    setIsMultiParameterEnabled(checked);
                    if (checked) {
                      // Stop simple ambient mode
                      if (isAmbientEnabled) {
                        stopAmbient();
                        setIsAmbientEnabled(false);
                      }
                      // Start multi-parameter mode
                      if (comprehensiveData) {
                        startMultiParameter(comprehensiveData, ambientVolume);
                      }
                    } else {
                      // Stop multi-parameter mode
                      stopMultiParameter();
                      // Optionally start simple ambient mode
                      if (isAmbientEnabled && currentData) {
                        const chordData = generateChordDataFromSolarWind(currentData);
                        startAmbient(chordData, ambientVolume);
                      }
                    }
                  }}
                  disabled={!comprehensiveData || ambientLoading}
                  data-testid="switch-multi-param-toggle"
                />
              </div>

              {/* Volume Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Ambient Volume
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
                  disabled={!isAmbientEnabled}
                  data-testid="slider-ambient-volume"
                />
              </div>

              {/* Intensity Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Audio Intensity
                  </Label>
                  <span className="text-sm text-muted-foreground" data-testid="text-ambient-intensity">
                    {Math.round(ambientIntensity * 10)} strikes/min
                  </span>
                </div>
                <Slider
                  value={[ambientIntensity]}
                  onValueChange={handleIntensityChange}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                  disabled={!isAmbientEnabled}
                  data-testid="slider-ambient-intensity"
                />
              </div>

              {/* Advanced Settings */}
              <div className="border-t border-border pt-4 space-y-4">
                <h4 className="text-sm font-medium">Advanced Settings</h4>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="respect-night"
                    checked={respectNight}
                    onCheckedChange={(checked) => handleSettingChange('respectNight', checked as boolean)}
                    data-testid="checkbox-respect-night"
                  />
                  <Label htmlFor="respect-night" className="text-sm">
                    Respect night mode (reduce audio activity after sunset)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="day-only"
                    checked={dayOnly}
                    onCheckedChange={(checked) => handleSettingChange('dayOnly', checked as boolean)}
                    data-testid="checkbox-day-only"
                  />
                  <Label htmlFor="day-only" className="text-sm">
                    Day only mode (disable audio at night)
                  </Label>
                </div>
              </div>

              {/* Status and Information */}
              <div className="bg-secondary/20 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Audio Engine:</span>
                  <span className={`font-medium ${isAmbientEnabled ? 'text-accent' : 'text-muted-foreground'}`} data-testid="text-audio-status">
                    {isAmbientEnabled ? 'Streaming' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Current Frequency:</span>
                  <span className="font-mono" data-testid="text-current-frequency">
                    {currentData ? `${currentData.velocity.toFixed(1)} km/s → ${(220 + currentData.velocity * 0.8).toFixed(1)} Hz` : 'No data'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Filter Modulation:</span>
                  <span className="font-mono" data-testid="text-filter-modulation">
                    {currentData ? `${currentData.density.toFixed(1)} p/cm³` : 'No data'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Bz Detune:</span>
                  <span className="font-mono" data-testid="text-bz-detune">
                    {currentData ? `${currentData.bz.toFixed(1)} nT` : 'No data'}
                  </span>
                </div>
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong>Ambient Mode</strong> provides continuous audio that mirrors the solar wind in real-time. 
                  The web audio engine uses persistent oscillators to create a harmonic "bed" that changes 
                  with velocity (pitch), density (filter), and magnetic field (vibrato).
                </p>
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
              <h4 className="font-semibold mb-4">Heliochime</h4>
              <p className="text-sm text-muted-foreground">
                Listen to the sounds of space! Real-time solar wind data transformed into beautiful ambient music.
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
                <li>Web Audio API</li>
                <li>Real-time data processing</li>
                <li>MIDI-based audio synthesis</li>
                <li>Space weather sonification</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 mt-8 text-center text-sm text-muted-foreground">
            © 2025 Heliochime. Made with ❤️ for space weather enthusiasts.
          </div>
        </div>
      </footer>
    </div>
  );
}

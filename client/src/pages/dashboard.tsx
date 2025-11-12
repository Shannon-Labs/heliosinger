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
import { useEnhancedAudio } from "@/hooks/use-enhanced-audio";
import type { AmbientSettings, ComprehensiveSpaceWeatherData } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Local state for ambient controls (must be declared before use)
  const [isAmbientEnabled, setIsAmbientEnabled] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [respectNight, setRespectNight] = useState(true);
  const [dayOnly, setDayOnly] = useState(false);
  
  // Enhanced audio hook - primary sonification system
  const enhancedAudio = useEnhancedAudio({
    enabled: isAmbientEnabled, // Enabled when ambient mode is on
    volume: ambientVolume,
    onError: (error) => {
      toast({
        title: "Audio Error",
        description: error.message,
        variant: "destructive",
      });
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

  // Ambient mode event handlers - uses enhanced audio as default
  // The useEnhancedAudio hook automatically starts/stops when enabled changes
  const handleAmbientToggle = (enabled: boolean) => {
    setIsAmbientEnabled(enabled);
    
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

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setAmbientVolume(newVolume);
    
    // Update enhanced audio volume immediately
    if (isAmbientEnabled && enhancedAudio.isActive) {
      enhancedAudio.setVolume(newVolume);
    }
    
    if (isAmbientEnabled) {
      setTimeout(() => {
        updateAmbientMutation.mutate({
          volume: newVolume,
          enabled: "true",
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
      volume: ambientVolume
    });
  };

  // Enhanced audio updates are handled automatically by the useEnhancedAudio hook
  // when comprehensiveData changes, so no additional useEffect needed here

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
                <h1 className="text-xl font-bold" data-testid="text-app-title">Heliosinger</h1>
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
                    Enhanced Ambient Audio
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Multi-layer sonification using all space weather parameters (solar wind, K-index, X-ray flux, and more)
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
                    {isAmbientEnabled ? 'Enhanced Mode Active' : 'Stopped'}
                  </span>
                </div>
                {enhancedAudio.currentMapping && (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Base Note:</span>
                      <span className="font-mono" data-testid="text-base-note">
                        {enhancedAudio.currentMapping.baseNote} ({enhancedAudio.currentMapping.frequency.toFixed(1)} Hz)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Harmonics:</span>
                      <span className="font-mono" data-testid="text-harmonics">
                        {enhancedAudio.currentMapping.harmonicCount} partials
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Condition:</span>
                      <span className="font-mono" data-testid="text-condition">
                        {enhancedAudio.currentMapping.condition}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Help Text */}
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  <strong>Enhanced Ambient Mode</strong> uses a scientifically-informed multi-layer sonification system that transforms 
                  real-time space weather data into rich, evolving audio. The system maps solar wind velocity to pitch, density to harmonic 
                  richness, temperature to spectral brightness, magnetic field to spatial audio, and K-index to rhythmic pulsing.
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
              <h4 className="font-semibold mb-4">Heliosinger</h4>
              <p className="text-sm text-muted-foreground">
                Real-time space weather data sonification.
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
            © 2025 Heliosinger
          </div>
        </div>
      </footer>
    </div>
  );
}

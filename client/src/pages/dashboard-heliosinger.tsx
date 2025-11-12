import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { SystemStatus } from "@/components/system-status";
import { DataDashboard } from "@/components/data-dashboard";
import { ComprehensiveSpaceWeather } from "@/components/comprehensive-space-weather";
import { HeliosingerGuide } from "@/components/heliosinger-guide";
import { VowelChart } from "@/components/vowel-chart";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAmbientSettings, saveAmbientSettings } from "@/lib/localStorage";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import { 
  getNotificationSettings, 
  saveNotificationSettings, 
  requestNotificationPermission,
  isNotificationSupported,
  canSendNotifications
} from "@/lib/notifications";
import { calculateRefetchInterval, getUpdateFrequencyDescription } from "@/lib/adaptive-refetch";
import type { AmbientSettings, ComprehensiveSpaceWeatherData } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Heliosinger hook - primary sonification system
  const [isHeliosingerEnabled, setIsHeliosingerEnabled] = useState(false);
  const [ambientVolume, setAmbientVolume] = useState(0.3);
  const [backgroundMode, setBackgroundMode] = useState(false);
  
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

  // Fetch current solar wind data (uses adaptive interval)
  const { data: currentData, isLoading: currentLoading, error: currentError } = useQuery<any>({
    queryKey: ["/api/solar-wind/current"],
    refetchInterval: () => updateFrequency,
    retry: false
  });

  // Fetch system status (always 30 seconds)
  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"],
    refetchInterval: 30000
  });

  // Fetch ambient settings (uses adaptive interval)
  const { data: ambientSettings, isLoading: ambientLoading } = useQuery({
    queryKey: ["/api/settings/ambient"],
    refetchInterval: () => updateFrequency
  });

  // Local state for controls
  const [notificationSettings, setNotificationSettings] = useState(() => getNotificationSettings());

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
    
    if (settings && typeof settings === 'object') {
      setAmbientVolume((settings as any).volume || 0.3);
      setBackgroundMode((settings as any).background_mode === "true");
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
    setIsHeliosingerEnabled(enabled);
    
    if (enabled) {
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
      // Heliosinger hook handles stopping automatically
      console.log("🌞 Heliosinger mode disabled");
    }

    updateAmbientMutation.mutate({
      enabled: enabled ? "true" : "false",
      volume: ambientVolume,
      smoothing: 0.8,
      max_rate: 10.0,
      battery_min: 20.0
    });
  };


  // Volume change handler
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setAmbientVolume(newVolume);
    
    if (isHeliosingerEnabled) {
      heliosinger.setVolume(newVolume);
    }
    
    if (isHeliosingerEnabled) {
      setTimeout(() => {
        updateAmbientMutation.mutate({
          volume: newVolume,
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <nav className="border-b border-border/50 bg-gradient-to-r from-background via-primary/5 to-background backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary via-accent to-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                <i className="fas fa-sun text-2xl text-primary-foreground animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" data-testid="text-app-title">
                  Heliosinger
                </h1>
                <p className="text-xs text-muted-foreground font-medium">The Sun Sings Space Weather</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-accent/20 to-primary/20 px-4 py-2 rounded-full border border-accent/30">
                <div className={`w-2.5 h-2.5 rounded-full ${isDataStreamActive ? 'bg-accent animate-pulse shadow-lg shadow-accent/50' : 'bg-destructive'}`} />
                <span className="text-sm font-medium" data-testid="text-data-status">
                  {isDataStreamActive ? 'Live Data' : 'Offline'}
                </span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => fetchDataMutation.mutate()}
                disabled={fetchDataMutation.isPending}
                data-testid="button-refresh-data"
                className="hover:bg-primary/10"
              >
                <i className={`fas fa-sync-alt ${fetchDataMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <div className="inline-block mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary via-accent to-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 animate-pulse">
              <i className="fas fa-sun text-4xl text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Heliosinger
          </h1>
          <p className="text-xl text-muted-foreground mb-2">
            The Sun Sings Space Weather
          </p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Experience space weather as the sun literally sings its story in real-time. 
            Each moment creates a unique vowel sound, pitch, and rhythm based on solar wind conditions.
          </p>
        </section>

        {/* Comprehensive Space Weather Display */}
        <div className="mb-8">
          <ComprehensiveSpaceWeather />
        </div>

        {/* Heliosinger Mode Controls */}
        <section className="mb-8">
          <Card className="bg-gradient-to-br from-background via-primary/5 to-accent/5 border-primary/20 shadow-lg">
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
                  disabled={!isHeliosingerEnabled}
                  data-testid="slider-ambient-volume"
                />
              </div>

              {/* Background Mode Toggle */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="background-mode-toggle" className="text-sm font-medium">
                    🌙 Background Mode
                  </Label>
                  <p className="text-xs text-muted-foreground">
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

              {/* Current Vowel Display */}
              {heliosinger.currentData && (
                <div className="bg-gradient-to-br from-primary/20 via-accent/10 to-primary/20 rounded-xl p-6 border-2 border-primary/30 shadow-lg">
                  <div className="text-center space-y-3">
                    <div className="text-7xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-lg" data-testid="current-vowel">
                      "{heliosinger.currentData.currentVowel.displayName}"
                    </div>
                    <div className="text-lg font-medium text-muted-foreground" data-testid="vowel-description">
                      {heliosinger.currentData.vowelDescription}
                    </div>
                    <div className="text-base italic font-semibold text-accent bg-accent/10 px-4 py-2 rounded-lg inline-block" data-testid="solar-mood">
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
                    {isHeliosingerEnabled ? '🌞 Singing' : 'Silent'}
                  </span>
                </div>
                
                {backgroundMode && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Background Mode:</span>
                    <Badge variant="default" className="text-xs">
                      🌙 Active
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
                      <span className="text-muted-foreground">Reverb:</span>
                      <span className="text-xs">
                        {Math.round(heliosinger.currentData.reverbRoomSize * 100)}% room
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Delay:</span>
                      <span className="text-xs">
                        {(heliosinger.currentData.delayTime * 1000).toFixed(0)}ms ({Math.round(heliosinger.currentData.delayGain * 100)}%)
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
                                     heliosinger.currentData.condition === 'storm' ? 'secondary' : 'default'}
                             className="text-xs">
                        {String(heliosinger.currentData.condition)}
                      </Badge>
                    </div>
                  </>
                )}
                
                {!heliosinger.currentData && currentData && typeof currentData === 'object' && 'velocity' in currentData ? (
                  <>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Velocity:</span>
                      <span className="font-mono" data-testid="text-velocity">
                        {(currentData as any).velocity.toFixed(1)} km/s
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Density:</span>
                      <span className="font-mono" data-testid="text-density">
                        {(currentData as any).density.toFixed(1)} p/cm³
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Bz:</span>
                      <span className="font-mono" data-testid="text-bz">
                        {(currentData as any).bz.toFixed(1)} nT
                      </span>
                    </div>
                  </>
                ) : null}
              </div>

            </CardContent>
          </Card>
        </section>

        {/* Notification Settings */}
        {isNotificationSupported() && (
          <section className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-bell text-primary" />
                  Notifications
                  {!canSendNotifications() && (
                    <Badge variant="secondary" className="ml-auto">
                      Permission Required
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canSendNotifications() && (
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Enable browser notifications to receive alerts about significant space weather events.
                    </p>
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
                    >
                      Enable Notifications
                    </Button>
                  </div>
                )}

                {canSendNotifications() && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="notifications-enabled" className="text-sm font-medium">
                          Enable Notifications
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Receive alerts for significant space weather events
                        </p>
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
                      <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="notify-kp" className="text-sm">
                            Kp Threshold Crossings
                          </Label>
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

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notify-condition" className="text-sm">
                            Condition Changes
                          </Label>
                          <Switch
                            id="notify-condition"
                            checked={notificationSettings.conditionChanges}
                            onCheckedChange={(checked) => {
                              const updated = { ...notificationSettings, conditionChanges: checked };
                              setNotificationSettings(updated);
                              saveNotificationSettings(updated);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notify-velocity" className="text-sm">
                            Large Velocity Changes
                          </Label>
                          <Switch
                            id="notify-velocity"
                            checked={notificationSettings.velocityChanges}
                            onCheckedChange={(checked) => {
                              const updated = { ...notificationSettings, velocityChanges: checked };
                              setNotificationSettings(updated);
                              saveNotificationSettings(updated);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <Label htmlFor="notify-bz" className="text-sm">
                            Strong Bz Events
                          </Label>
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

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <Label htmlFor="notify-sound" className="text-sm">
                            Sound Notifications
                          </Label>
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
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Educational Guide */}
        <section className="mb-8">
          <HeliosingerGuide />
        </section>

        {/* Vowel Chart */}
        <section className="mb-8">
          <VowelChart 
            currentVowel={heliosinger.currentData?.vowelName}
            currentVowelData={heliosinger.currentData ? {
              name: heliosinger.currentData.vowelName,
              displayName: heliosinger.currentData.currentVowel.displayName,
              openness: heliosinger.currentData.currentVowel.openness,
              frontness: heliosinger.currentData.currentVowel.frontness,
              brightness: heliosinger.currentData.currentVowel.brightness
            } : undefined}
          />
        </section>

        {/* Data Dashboard */}
        <DataDashboard />

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

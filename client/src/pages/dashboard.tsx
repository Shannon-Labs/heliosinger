import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SolarWindDisplay } from "@/components/solar-wind-display";
import { ChordVisualization } from "@/components/chord-visualization";
import { HardwareConfig } from "@/components/hardware-config";
import { MappingAlgorithm } from "@/components/mapping-algorithm";
import { SystemStatus } from "@/components/system-status";
import { DataDashboard } from "@/components/data-dashboard";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current solar wind data
  const { data: currentData, isLoading: currentLoading, error: currentError } = useQuery({
    queryKey: ["/api/solar-wind/current"],
    refetchInterval: 60000, // Refetch every minute
    retry: false
  });

  // Fetch system status
  const { data: systemStatus } = useQuery({
    queryKey: ["/api/system/status"],
    refetchInterval: 30000
  });

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
                <h1 className="text-xl font-bold" data-testid="text-app-title">Solar Wind Chime</h1>
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

        {/* Data Dashboard */}
        <DataDashboard />

        {/* Hardware Configuration */}
        <HardwareConfig />

        {/* Mapping Algorithm */}
        <MappingAlgorithm />

        {/* System Status */}
        <SystemStatus />

        {/* Patent Information */}
        <section className="mb-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <i className="fas fa-copyright mr-3 text-warning" />
                Patent Information
              </h2>
              
              <div className="bg-warning/10 border border-warning/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-warning mb-3">
                  "Resonant notification device converting real-time solar-wind parameters into multi-modal acoustic and optical cues"
                </h3>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="font-medium">Status:</span>
                    <Badge variant="outline" className="ml-2 text-warning border-warning">
                      Provisional File Ready
                    </Badge>
                  </div>
                  
                  <div className="bg-secondary/30 rounded-lg p-4 font-mono text-xs">
                    <div className="text-muted-foreground mb-2">Claim 1 (Draft):</div>
                    <div className="leading-relaxed">
                      "A space-weather alert device comprising:<br />
                      (a) a receiver module configured to download at least solar-wind velocity, density, and interplanetary magnetic-field orientation;<br />
                      (b) a mapper that translates each parameter into a distinct acoustic feature selected from the group consisting of pitch, decay envelope, and beat frequency; and<br />
                      (c) at least one electromechanical striker configured to excite a resonator in accordance with the mapped acoustic feature, whereby a listener perceives the combined acoustic output as a single space-weather chord."
                    </div>
                  </div>
                  
                  <div className="text-muted-foreground">
                    <div className="font-medium mb-2">Required Enablement Documentation:</div>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>ESP-32 pinout configuration</li>
                      <li>Three-line lookup table implementation</li>
                      <li>Spectrograms for quiet, moderate, and storm conditions</li>
                      <li>Wind-chime geometry specifications</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="font-semibold mb-4">Solar Wind Chime</h4>
              <p className="text-sm text-muted-foreground">
                Real-time space weather sonification for educational and research purposes.
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
                <li>ESP32 microcontroller platform</li>
                <li>Solar-powered operation</li>
                <li>MIDI-based audio synthesis</li>
                <li>Magnetic chime actuators</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border pt-8 mt-8 text-center text-sm text-muted-foreground">
            © 2024 Solar Wind Chime Project. Educational and research use.
          </div>
        </div>
      </footer>
    </div>
  );
}

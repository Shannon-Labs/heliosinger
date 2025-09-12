import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { playChord } from "@/lib/audio-engine";

interface ChordVisualizationProps {
  velocity: number;
  density: number;
  bz: number;
}

export function ChordVisualization({ velocity, density, bz }: ChordVisualizationProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  // Calculate chord data
  const { data: chordData, isLoading } = useQuery({
    queryKey: ["/api/mapping/calculate-chord", { velocity, density, bz }],
    queryFn: async () => {
      const response = await fetch("/api/mapping/calculate-chord", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ velocity, density, bz })
      });
      if (!response.ok) throw new Error("Failed to calculate chord");
      return response.json();
    },
    enabled: !!(velocity && density && bz !== undefined)
  });

  const handlePlayChord = async () => {
    if (!chordData) return;
    
    try {
      setIsPlaying(true);
      await playChord(chordData);
      toast({
        title: "Chord Played",
        description: `${chordData.baseNote} chord with ${chordData.condition} space weather characteristics`,
      });
    } catch (error) {
      toast({
        title: "Audio Error",
        description: "Failed to play chord. Check audio permissions.",
        variant: "destructive",
      });
    } finally {
      setIsPlaying(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (!chordData) return null;

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'quiet': return 'text-accent';
      case 'moderate': return 'text-warning';
      case 'storm': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getConditionBg = (condition: string) => {
    switch (condition) {
      case 'quiet': return 'bg-accent/10 border-accent/30';
      case 'moderate': return 'bg-warning/10 border-warning/30';
      case 'storm': return 'bg-destructive/10 border-destructive/30';
      default: return 'bg-secondary/30 border-border';
    }
  };

  return (
    <section className="mb-8">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Current Solar Wind Chord</h2>
            <Button 
              onClick={handlePlayChord}
              disabled={isPlaying}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-play-chord"
            >
              <i className={`fas ${isPlaying ? 'fa-spinner fa-spin' : 'fa-play'} mr-2`} />
              {isPlaying ? "Playing..." : "Play Chord"}
            </Button>
          </div>
          
          {/* Current Condition Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-6 ${getConditionBg(chordData.condition)}`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${getConditionColor(chordData.condition).replace('text-', 'bg-')}`} />
            <span className={getConditionColor(chordData.condition)}>
              {chordData.condition.charAt(0).toUpperCase() + chordData.condition.slice(1)} Space Weather
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Waveform Display */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Waveform Analysis</h3>
              <div className="bg-secondary/30 rounded-lg p-4 h-64 flex items-end justify-center space-x-1">
                {/* Generate visual waveform based on chord data */}
                {Array.from({ length: 32 }, (_, i) => {
                  const baseHeight = 20 + (Math.sin(i * 0.3) * 15);
                  const velocityMod = (chordData.midiNote - 36) / 48 * 30;
                  const densityMod = chordData.decayTime * 10;
                  const bzMod = chordData.detuneCents !== 0 ? Math.sin(i * 0.8) * 10 : 0;
                  
                  const height = Math.max(10, baseHeight + velocityMod + densityMod + bzMod);
                  
                  let colorClass = 'bg-primary';
                  if (i > 20) colorClass = 'bg-accent';
                  if (i > 26) colorClass = chordData.detuneCents !== 0 ? 'bg-warning' : 'bg-accent';
                  
                  return (
                    <div 
                      key={i}
                      className={`w-2 ${colorClass} rounded-t transition-all duration-300`}
                      style={{ height: `${height}%` }}
                    />
                  );
                })}
              </div>
              <div className="text-sm text-muted-foreground">
                Live chord visualization showing harmonics and beat frequencies
              </div>
            </div>
            
            {/* Chord Components */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Chord Components</h3>
              <div className="space-y-3">
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Base Note (Velocity)</span>
                    <span className="text-primary font-mono" data-testid="text-chord-base-note">
                      {chordData.baseNote} ({chordData.frequency.toFixed(1)} Hz)
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${((chordData.midiNote - 36) / 48) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Envelope (Density)</span>
                    <span className="text-accent font-mono" data-testid="text-chord-envelope">
                      {chordData.decayTime}s decay
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(chordData.decayTime / 5.0) * 100}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Detune (Bz Field)</span>
                    <span className={`font-mono ${chordData.detuneCents !== 0 ? 'text-warning' : 'text-muted-foreground'}`} data-testid="text-chord-detune">
                      {chordData.detuneCents} cents
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${chordData.detuneCents !== 0 ? 'bg-warning' : 'bg-muted-foreground/30'}`}
                      style={{ width: `${chordData.detuneCents !== 0 ? 80 : 5}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Chord Summary */}
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Musical Interpretation</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>
                    <span className="font-medium">Pitch:</span> {chordData.baseNote} reflects solar wind speed of {velocity.toFixed(1)} km/s
                  </div>
                  <div>
                    <span className="font-medium">Timbre:</span> {chordData.decayTime < 1 ? 'Sharp pluck' : chordData.decayTime > 3 ? 'Long gong' : 'Medium bell'} from density {density.toFixed(1)} p/cm³
                  </div>
                  <div>
                    <span className="font-medium">Harmony:</span> {chordData.detuneCents !== 0 ? 'Discordant beating warns of geomagnetic activity' : 'Clean tone indicates stable magnetic field'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

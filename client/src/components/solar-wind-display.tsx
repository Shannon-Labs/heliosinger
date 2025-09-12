import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { SolarWindReading } from "@shared/schema";

interface SolarWindDisplayProps {
  data?: SolarWindReading;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

export function SolarWindDisplay({ data, loading, onRefresh, refreshing }: SolarWindDisplayProps) {
  if (loading && !data) {
    return (
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-10 w-24 mb-3" />
                <Skeleton className="h-4 w-40 mb-3" />
                <Skeleton className="h-2 w-full mb-3" />
                <Skeleton className="h-3 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground mb-4">
              <i className="fas fa-satellite text-4xl mb-2" />
              <h3 className="text-lg font-semibold">No Solar Wind Data Available</h3>
              <p className="text-sm">Click refresh to fetch the latest data from NOAA DSCOVR</p>
            </div>
            <Button onClick={onRefresh} disabled={refreshing} data-testid="button-fetch-initial-data">
              <i className="fas fa-download mr-2" />
              {refreshing ? "Fetching..." : "Fetch Data"}
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Calculate MIDI note for velocity (approximate)
  const velocityRange = 800 - 200;
  const midiRange = 84 - 36;
  const velocityNormalized = Math.max(0, Math.min(1, (data.velocity - 200) / velocityRange));
  const midiNote = Math.round(36 + (velocityNormalized * midiRange));
  
  // Convert MIDI to note name
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor((midiNote - 12) / 12);
  const noteIndex = (midiNote - 12) % 12;
  const noteName = `${noteNames[noteIndex]}${octave}`;

  // Calculate decay time indicator
  const densityNormalized = Math.max(0, Math.min(1, Math.log(data.density / 0.5) / Math.log(50.0 / 0.5)));
  const decayTime = 0.2 + ((1 - densityNormalized) * (5.0 - 0.2));
  let decayLabel = "Short";
  if (decayTime > 3.0) decayLabel = "Long";
  else if (decayTime > 1.5) decayLabel = "Medium";

  // Determine geomagnetic risk
  const isGeorisk = data.bz < -5.0;
  const detuneCents = isGeorisk ? -20 : 0;

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Solar Wind Velocity */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Solar Wind Velocity</h3>
              <i className="fas fa-wind text-primary" />
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-primary" data-testid="text-velocity">
                {data.velocity.toFixed(1)} km/s
              </div>
              <div className="text-sm text-muted-foreground">
                MIDI Note: <span className="text-accent font-mono" data-testid="text-velocity-note">{noteName}</span>
              </div>
              <div className="waveform"></div>
              <div className="text-xs text-muted-foreground">
                Range: 200-800 km/s → C2-C6
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plasma Density */}
        <Card className="hover:border-accent/50 transition-colors">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Plasma Density</h3>
              <i className="fas fa-atom text-accent" />
            </div>
            <div className="space-y-3">
              <div className="text-3xl font-bold text-accent" data-testid="text-density">
                {data.density.toFixed(1)} p/cm³
              </div>
              <div className="text-sm text-muted-foreground">
                Decay: <span className="text-warning font-mono" data-testid="text-decay-type">{decayLabel}</span>
              </div>
              <div className="flex space-x-1 h-2">
                <div className="flex-1 bg-accent rounded-sm"></div>
                <div className={`flex-1 ${decayTime > 1 ? 'bg-accent/70' : 'bg-accent/20'} rounded-sm`}></div>
                <div className={`flex-1 ${decayTime > 2 ? 'bg-accent/40' : 'bg-accent/10'} rounded-sm`}></div>
                <div className={`flex-1 ${decayTime > 3 ? 'bg-accent/20' : 'bg-accent/5'} rounded-sm`}></div>
              </div>
              <div className="text-xs text-muted-foreground">
                Low density = long gong, High = short pluck
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bz Magnetic Field */}
        <Card className={`${isGeorisk ? 'border-warning hover:border-warning/70 glow' : 'hover:border-muted-foreground/50'} transition-colors`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bz Magnetic Field</h3>
              <i className={`fas fa-magnet ${isGeorisk ? 'text-warning' : 'text-muted-foreground'}`} />
            </div>
            <div className="space-y-3">
              <div className={`text-3xl font-bold ${isGeorisk ? 'text-warning' : 'text-muted-foreground'}`} data-testid="text-bz">
                {data.bz.toFixed(1)} nT
              </div>
              <div className="text-sm text-muted-foreground">
                Detune: <span className={`font-mono ${isGeorisk ? 'text-destructive' : 'text-muted-foreground'}`} data-testid="text-detune">
                  {detuneCents} cents
                </span>
              </div>
              {isGeorisk ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-8 h-8 bg-destructive rounded-full pulse-animation flex items-center justify-center">
                    <i className="fas fa-exclamation text-xs" />
                  </div>
                  <span className="text-destructive font-medium" data-testid="text-geomagnetic-risk">Geomagnetic Risk</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center">
                    <i className="fas fa-check text-xs text-accent" />
                  </div>
                  <span className="text-accent font-medium">Normal</span>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Southward Bz creates audible beating
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

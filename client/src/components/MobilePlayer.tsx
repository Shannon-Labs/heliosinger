import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useIsMobile } from '@/hooks/use-mobile';
import type { HeliosingerData } from '@/lib/heliosinger-mapping';

interface MobilePlayerProps {
  isEnabled: boolean;
  isPlaying: boolean;
  volume: number;
  currentData: HeliosingerData | null;
  onToggle: (enabled: boolean) => void;
  onVolumeChange: (volume: number) => void;
}

export function MobilePlayer({
  isEnabled,
  isPlaying,
  volume,
  currentData,
  onToggle,
  onVolumeChange,
}: MobilePlayerProps) {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-2 md:hidden">
      <Card className="bg-background/95 backdrop-blur-md border-t shadow-lg">
        <div className="p-3">
          {/* Collapsed view */}
          {!isExpanded && (
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onPointerDown={(e) => { e.preventDefault(); onToggle(!isPlaying); }}
                className="flex-shrink-0"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-lg`} aria-hidden="true" />
              </Button>
              
              <div className="flex-1 min-w-0" onClick={() => setIsExpanded(true)}>
                {currentData ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {currentData.currentVowel.displayName}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {currentData.baseNote} ({currentData.frequency.toFixed(0)} Hz)
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {currentData.solarMood}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {isEnabled ? 'Starting...' : 'Tap to enable'}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                aria-label="Expand player"
              >
                <i className="fas fa-chevron-up" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* Expanded view */}
          {isExpanded && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Heliosinger Player</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  aria-label="Collapse player"
                >
                  <i className="fas fa-chevron-down" aria-hidden="true" />
                </Button>
              </div>

              {/* Current vowel display */}
              {currentData && (
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold">
                    {currentData.currentVowel.displayName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentData.vowelDescription}
                  </div>
                  <div className="text-xs font-mono">
                    {currentData.baseNote} at {currentData.frequency.toFixed(1)} Hz
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant={isPlaying ? 'default' : 'outline'}
                    size="lg"
                    onPointerDown={(e) => { e.preventDefault(); onToggle(!isPlaying); }}
                    className="flex-1"
                  >
                    <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`} aria-hidden="true" />
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                </div>

                {/* Volume control */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Volume</span>
                    <span className="font-mono">{Math.round(volume * 100)}%</span>
                  </div>
                  <Slider
                    value={[volume]}
                    onValueChange={(vals) => {
                      const newVolume = Math.max(0, Math.min(1, vals[0]));
                      onVolumeChange(newVolume);
                    }}
                    max={1}
                    min={0}
                    step={0.01}
                    className="w-full"
                    aria-label="Volume"
                  />
                </div>

                {/* Status info */}
                {currentData && (
                  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
                    <div className="flex justify-between">
                      <span>Condition:</span>
                      <span className="font-medium capitalize">{currentData.condition}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Harmonics:</span>
                      <span>{currentData.harmonicCount} partials</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

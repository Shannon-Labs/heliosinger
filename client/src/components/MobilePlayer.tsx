import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useIsMobile } from '@/hooks/use-mobile';
import { AudioVisualizer } from '@/components/AudioVisualizer';
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
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div className="bg-black/95 backdrop-blur-md border-t-2 border-primary shadow-[0_-4px_0px_rgba(0,0,0,0.8)]">
        <div className="px-3 py-2">
          {/* Collapsed view */}
          {!isExpanded && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onPointerDown={(e) => { e.preventDefault(); onToggle(!isPlaying); }}
                className="flex-shrink-0 h-10 w-10 border-2 border-primary bg-primary text-black hover:bg-primary/80"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`} aria-hidden="true" />
              </Button>

              <div className="flex-1 min-w-0" onClick={() => setIsExpanded(true)}>
                {currentData ? (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black uppercase text-white">
                        {currentData.currentVowel.displayName}
                      </span>
                      <span className="text-[10px] text-primary font-mono">
                        {currentData.baseNote} ({currentData.frequency.toFixed(0)} Hz)
                      </span>
                    </div>
                    <div className="text-[10px] text-white/50 truncate font-mono uppercase">
                      {currentData.solarMood}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-white/50 uppercase font-black">
                    {isEnabled ? 'Starting...' : 'Tap play to enable'}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                className="flex-shrink-0 h-8 w-8 text-white/50 hover:text-white"
                aria-label="Expand player"
              >
                <i className="fas fa-chevron-up text-xs" aria-hidden="true" />
              </Button>
            </div>
          )}

          {/* Expanded view */}
          {isExpanded && (
            <div className="space-y-3 pb-1">
              <div className="flex items-center justify-between">
                <h3 className="font-black uppercase tracking-tight text-sm text-primary">Heliosinger</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 text-white/50 hover:text-white"
                  aria-label="Collapse player"
                >
                  <i className="fas fa-chevron-down text-xs" aria-hidden="true" />
                </Button>
              </div>

              {/* Current vowel display */}
              {currentData && (
                <div className="space-y-2">
                  <div className="border-2 border-white/10">
                    <AudioVisualizer
                      isPlaying={isPlaying}
                      data={currentData}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-white">
                      {currentData.currentVowel.displayName}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-primary">
                        {currentData.baseNote} at {currentData.frequency.toFixed(1)} Hz
                      </div>
                      <div className="text-[10px] text-white/50 truncate">
                        {currentData.vowelDescription}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="space-y-3">
                <Button
                  variant={isPlaying ? 'default' : 'outline'}
                  onPointerDown={(e) => { e.preventDefault(); onToggle(!isPlaying); }}
                  className={`w-full h-11 font-black uppercase tracking-wider border-2 ${
                    isPlaying
                      ? 'bg-primary text-black border-primary hover:bg-primary/80'
                      : 'bg-black text-white border-white hover:bg-white hover:text-black'
                  }`}
                >
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`} aria-hidden="true" />
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                {/* Volume control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="uppercase font-bold text-white/70">Volume</span>
                    <span className="font-mono text-primary">{Math.round(volume * 100)}%</span>
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
                  <div className="text-[10px] text-white/40 font-mono uppercase flex justify-between pt-1 border-t border-white/10">
                    <span>Condition: {currentData.condition}</span>
                    <span>{currentData.harmonicCount} partials</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

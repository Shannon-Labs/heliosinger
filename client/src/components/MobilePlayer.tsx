import { useState } from 'react';
import { Card } from '@/components/ui/card';
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
      <div className="bg-black/95 backdrop-blur-md border-t-2 border-primary">
        <div className="px-3 py-2">
          {/* Collapsed view */}
          {!isExpanded && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onPointerDown={(e) => { e.preventDefault(); onToggle(!isPlaying); }}
                className="flex-shrink-0 h-9 w-9 border border-primary text-primary"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-sm`} aria-hidden="true" />
              </Button>

              <div className="flex-1 min-w-0" onClick={() => setIsExpanded(true)}>
                {currentData ? (
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white uppercase">
                      {currentData.currentVowel.displayName}
                    </span>
                    <span className="text-[10px] text-white/60 font-mono truncate">
                      {currentData.baseNote} {currentData.frequency.toFixed(0)}Hz
                    </span>
                    <span className="text-[10px] text-white/40 truncate hidden min-[400px]:inline">
                      {currentData.solarMood}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-white/60 font-mono uppercase">
                    {isEnabled ? 'Starting...' : 'Tap play'}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(true)}
                className="flex-shrink-0 h-9 w-9 text-white/60"
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
                <h3 className="font-black text-sm uppercase tracking-wider text-primary">Heliosinger</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 text-white/60"
                  aria-label="Collapse player"
                >
                  <i className="fas fa-chevron-down text-xs" aria-hidden="true" />
                </Button>
              </div>

              {/* Current vowel display */}
              {currentData && (
                <div className="text-center space-y-1">
                  <div className="mb-2 border border-white/10">
                    <AudioVisualizer
                      isPlaying={isPlaying}
                      data={currentData}
                    />
                  </div>
                  <div className="text-3xl font-black text-white">
                    {currentData.currentVowel.displayName}
                  </div>
                  <div className="text-[10px] text-white/60 font-mono">
                    {currentData.baseNote} at {currentData.frequency.toFixed(1)} Hz
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="space-y-2">
                <Button
                  variant={isPlaying ? 'default' : 'outline'}
                  onPointerDown={(e) => { e.preventDefault(); onToggle(!isPlaying); }}
                  className="w-full h-10 font-black uppercase tracking-wider"
                >
                  <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} mr-2`} aria-hidden="true" />
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                {/* Volume control */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-white/60 uppercase font-mono w-8">Vol</span>
                  <Slider
                    value={[volume]}
                    onValueChange={(vals) => {
                      const newVolume = Math.max(0, Math.min(1, vals[0]));
                      onVolumeChange(newVolume);
                    }}
                    max={1}
                    min={0}
                    step={0.01}
                    className="flex-1"
                    aria-label="Volume"
                  />
                  <span className="text-[10px] font-mono text-white/60 w-8 text-right">{Math.round(volume * 100)}%</span>
                </div>

                {/* Status info */}
                {currentData && (
                  <div className="flex items-center justify-between text-[10px] text-white/50 font-mono uppercase pt-1 border-t border-white/10">
                    <span>{currentData.condition}</span>
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

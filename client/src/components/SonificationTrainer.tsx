import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AudioVisualizer } from "@/components/AudioVisualizer";
import type { ComprehensiveSpaceWeatherData, SolarWindReading } from "@shared/schema";

interface SonificationTrainerProps {
  currentData: any; // Heliosinger data
  comprehensiveData?: ComprehensiveSpaceWeatherData;
}

export function SonificationTrainer({ currentData, comprehensiveData }: SonificationTrainerProps) {
  if (!currentData || !comprehensiveData || !comprehensiveData.solar_wind) return null;

  const { velocity, density, bz } = comprehensiveData.solar_wind;
  const vowel = currentData.vowelName;

  // Helper to describe values
  const getDensityDesc = (d: number) => {
    if (d < 3) return "VERY LOW";
    if (d < 5) return "LOW";
    if (d < 10) return "MODERATE";
    if (d < 20) return "HIGH";
    return "EXTREME";
  };

  const getVelocityDesc = (v: number) => {
    if (v < 300) return "VERY SLOW";
    if (v < 400) return "SLOW";
    if (v < 500) return "MODERATE";
    if (v < 700) return "FAST";
    return "VERY FAST";
  };

  const getBzDesc = (b: number) => {
    if (b < -5) return "SOUTH (STORM)";
    if (b < -1) return "SOUTH";
    if (b > 5) return "NORTH (STABLE)";
    if (b > 1) return "NORTH";
    return "NEUTRAL";
  };

  // Generate explanation based on the specific vowel being heard
  const getExplanation = (v: string) => {
    switch (v) {
      case 'I': // High Pitch/Bright/Front
        return "You hear 'I' (ee) because the solar wind is FAST and HOT, or the magnetic field is pointing SOUTH.";
      case 'E': // Mid-High/Front
        return "You hear 'E' (eh) because conditions are moderately ACTIVE with some SOUTHWARD magnetic field.";
      case 'A': // Open/Central
        return "You hear 'A' (ah) because the plasma density is LOW, creating an open, clear sound.";
      case 'O': // Back/Rounded
        return "You hear 'O' (oh) because the magnetic field is NORTHWARD (stable) or density is increasing.";
      case 'U': // Low/Dark/Back
        return "You hear 'U' (oo) because the solar wind is SLOW and COLD, or density is HIGH (muffled).";
      default:
        return "The sun's voice changes with the plasma.";
    }
  };

  // Rotating educational tips
  const [tipIndex, setTipIndex] = React.useState(0);
  const TIPS = [
    "Watch how the vowel shifts when these numbers change.",
    "Higher pitch means faster solar wind velocity.",
    "A 'shimmering' texture indicates high electron flux.",
    "Southward Bz (negative) creates wider stereo separation.",
    "Geomagnetic storms (high Kp) add tremolo and rhythm.",
    "The sun's voice is a real-time translation of physics.",
    "Harmonic complexity increases with plasma temperature.",
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(i => (i + 1) % TIPS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-2 md:border-4 border-primary bg-black p-3 md:p-6 shadow-[4px_4px_0px_0px_hsl(var(--primary))] md:shadow-[8px_8px_0px_0px_hsl(var(--primary))] mb-6 md:mb-8">
      <div className="flex items-center justify-between mb-4 md:mb-6 border-b-2 md:border-b-4 border-primary pb-2 gap-2">
        <h3 className="text-lg sm:text-2xl font-black uppercase tracking-tighter text-primary">
          Training Mode
        </h3>
        <Badge variant="outline" className="border-2 border-primary text-primary font-bold rounded-none uppercase text-[10px] sm:text-xs flex-shrink-0">
          Active Listening
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Left: The Sound */}
        <div className="space-y-3 md:space-y-4">
          <div>
            <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">You Are Hearing</span>

            <div className="mb-3 md:mb-4 border-2 border-white/10">
              <AudioVisualizer
                isPlaying={true}
                data={currentData}
              />
            </div>

            <div className="flex items-baseline gap-2 sm:gap-4">
              <span className="text-5xl sm:text-6xl md:text-8xl font-black text-white leading-none">
                "{vowel}"
              </span>
              <span className="text-base sm:text-xl font-mono text-primary uppercase">
                /{currentData.currentVowel.ipaSymbol}/
              </span>
            </div>
            <p className="text-base sm:text-lg font-bold text-white mt-2 uppercase">
              {currentData.currentVowel.displayName}
            </p>
          </div>

          <div className="bg-secondary/50 p-3 md:p-4 border-l-2 md:border-l-4 border-accent">
            <p className="text-sm sm:text-lg font-medium text-white italic leading-tight">
              "{getExplanation(vowel)}"
            </p>
          </div>
        </div>

        {/* Right: The Data (The "Why") */}
        <div className="space-y-4">
           <span className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Because Data Is</span>
           
           <div className="space-y-3 font-mono">
             {/* Velocity -> Pitch/Brightness */}
             <div className="flex items-center justify-between border-b border-white/10 pb-2">
               <span className="text-muted-foreground">VELOCITY</span>
               <div className="text-right">
                 <span className={`block font-bold ${velocity > 500 ? 'text-accent' : 'text-white'}`}>
                   {getVelocityDesc(velocity)}
                 </span>
                 <span className="text-xs text-muted-foreground">{velocity.toFixed(1)} km/s</span>
               </div>
             </div>

             {/* Density -> Openness */}
             <div className="flex items-center justify-between border-b border-white/10 pb-2">
               <span className="text-muted-foreground">DENSITY</span>
               <div className="text-right">
                 <span className={`block font-bold ${density < 5 ? 'text-accent' : 'text-white'}`}>
                   {getDensityDesc(density)}
                 </span>
                 <span className="text-xs text-muted-foreground">{density.toFixed(1)} p/cm³</span>
               </div>
             </div>

             {/* Bz -> Frontness */}
             <div className="flex items-center justify-between border-b border-white/10 pb-2">
               <span className="text-muted-foreground">MAG FIELD</span>
               <div className="text-right">
                 <span className={`block font-bold ${bz < 0 ? 'text-destructive' : 'text-success'}`}>
                   {getBzDesc(bz)}
                 </span>
                 <span className="text-xs text-muted-foreground">{bz.toFixed(1)} nT</span>
               </div>
             </div>
           </div>

           <div className="mt-4 pt-2">
             <p className="text-xs text-muted-foreground uppercase animate-pulse">
               <span className="text-accent font-bold">TIP:</span> {TIPS[tipIndex]}
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}

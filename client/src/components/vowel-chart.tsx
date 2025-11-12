import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VOWEL_FORMANTS, type VowelName, type VowelFormants } from "@/lib/vowel-filters";
import { VocalTractDiagram } from "@/components/VocalTractDiagram";

interface VowelChartProps {
  currentVowel?: VowelName;
  currentVowelData?: {
    name: VowelName;
    displayName: string;
    openness: number;
    frontness: number;
    brightness: number;
  };
}

export function VowelChart({ currentVowel, currentVowelData }: VowelChartProps) {
  const vowels = Object.values(VOWEL_FORMANTS);
  
  // Calculate positions for 2D chart (frontness vs openness)
  const chartWidth = 400;
  const chartHeight = 300;
  const padding = 40;

  const getVowelPosition = (vowel: VowelFormants) => {
    const x = padding + (vowel.frontness * (chartWidth - padding * 2));
    const y = padding + ((1 - vowel.openness) * (chartHeight - padding * 2));
    return { x, y };
  };

  const getBrightnessColor = (brightness: number) => {
    const hue = 200 + (brightness * 60); // Blue to yellow
    const saturation = 70 + (brightness * 30);
    const lightness = 50 + (brightness * 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <Card className="bg-gradient-to-br from-background via-primary/5 to-accent/5 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-chart-area text-primary" />
          Vowel Chart
          {currentVowelData && (
            <Badge variant="default" className="ml-auto">
              Current: "{currentVowelData.displayName}"
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Chart Container */}
          <div className="relative w-full max-w-full overflow-x-auto">
            <div className="mx-auto" style={{ width: chartWidth, height: chartHeight }}>
              {/* SVG Chart */}
              <svg width={chartWidth} height={chartHeight} className="border border-border rounded-lg bg-background/50 w-full h-auto">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Axes */}
              <line
                x1={padding}
                y1={chartHeight - padding}
                x2={chartWidth - padding}
                y2={chartHeight - padding}
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.3"
              />
              <line
                x1={padding}
                y1={chartHeight - padding}
                x2={padding}
                y2={padding}
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.3"
              />

              {/* Axis labels */}
              <text
                x={chartWidth / 2}
                y={chartHeight - 10}
                textAnchor="middle"
                className="text-xs fill-muted-foreground font-medium"
              >
                Frontness (Front → Back)
              </text>
              <text
                x={15}
                y={chartHeight / 2}
                textAnchor="middle"
                className="text-xs fill-muted-foreground font-medium"
                transform={`rotate(-90, 15, ${chartHeight / 2})`}
              >
                Openness (Open → Closed)
              </text>

              {/* Vowel points */}
              {vowels.map((vowel) => {
                const pos = getVowelPosition(vowel);
                const isCurrent = currentVowel === vowel.name;
                const color = getBrightnessColor(vowel.brightness);
                
                return (
                  <g key={vowel.name}>
                    {/* Vowel circle */}
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={isCurrent ? 12 : 8}
                      fill={isCurrent ? color : `${color}80`}
                      stroke={isCurrent ? "currentColor" : "none"}
                      strokeWidth={isCurrent ? 3 : 0}
                      className={isCurrent ? "animate-pulse" : ""}
                      opacity={isCurrent ? 1 : 0.7}
                    />
                    {/* Vowel label */}
                    <text
                      x={pos.x}
                      y={pos.y + (isCurrent ? -20 : -14)}
                      textAnchor="middle"
                      className={`text-xs font-bold ${isCurrent ? "fill-foreground" : "fill-muted-foreground"}`}
                    >
                      {vowel.displayName}
                    </text>
                    {/* IPA symbol */}
                    <text
                      x={pos.x}
                      y={pos.y + (isCurrent ? -6 : -2)}
                      textAnchor="middle"
                      className={`text-[10px] ${isCurrent ? "fill-foreground/80" : "fill-muted-foreground/70"}`}
                    >
                      {vowel.ipaSymbol}
                    </text>
                    {/* Formant info on hover */}
                    <title>
                      {vowel.displayName} {vowel.ipaSymbol}: F1={vowel.formants[0]}Hz, F2={vowel.formants[1]}Hz
                      {"\n"}
                      Openness: {Math.round(vowel.openness * 100)}%, Frontness: {Math.round(vowel.frontness * 100)}%
                    </title>
                  </g>
                );
              })}

              {/* Current vowel highlight ring */}
              {currentVowelData && (
                (() => {
                  const vowel = vowels.find(v => v.name === currentVowel);
                  if (!vowel) return null;
                  const pos = getVowelPosition(vowel);
                  return (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={18}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      opacity="0.5"
                      className="animate-pulse"
                    />
                  );
                })()
              )}
            </svg>
            </div>
          </div>

          {/* Vocal Tract Diagram */}
          {currentVowelData && VOWEL_FORMANTS[currentVowelData.name] && (
            <div className="pt-4 border-t border-border/50">
              <VocalTractDiagram
                vowel={VOWEL_FORMANTS[currentVowelData.name]}
                frequency={undefined}
              />
            </div>
          )}

          {/* Legend */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-semibold mb-2">Brightness Scale</div>
              <div className="flex gap-1 items-center">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getBrightnessColor(0) }} />
                <span className="text-muted-foreground">Dark (U)</span>
                <div className="flex-1" />
                <div className="w-4 h-4 rounded" style={{ backgroundColor: getBrightnessColor(1) }} />
                <span className="text-muted-foreground">Bright (I)</span>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-2">Current Vowel Info</div>
              {currentVowelData ? (
                <div className="space-y-1 text-muted-foreground">
                  <div className="font-semibold text-foreground text-sm">
                    {currentVowelData.displayName} /{VOWEL_FORMANTS[currentVowelData.name].ipaSymbol}/
                  </div>
                  <div className="text-xs">
                    <div>Openness: {Math.round(currentVowelData.openness * 100)}%</div>
                    <div>Frontness: {Math.round(currentVowelData.frontness * 100)}%</div>
                    <div>Brightness: {Math.round(currentVowelData.brightness * 100)}%</div>
                  </div>
                  {VOWEL_FORMANTS[currentVowelData.name] && (
                    <div className="text-[10px] mt-1 pt-1 border-t border-border/30">
                      <div>F1: {VOWEL_FORMANTS[currentVowelData.name].formants[0]} Hz</div>
                      <div>F2: {VOWEL_FORMANTS[currentVowelData.name].formants[1]} Hz</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground text-xs">Enable Heliosinger to see current vowel</div>
              )}
            </div>
          </div>

          {/* Vowel descriptions */}
          <div className="pt-4 border-t border-border/50">
            <div className="text-xs text-muted-foreground space-y-2">
              <div>
                <p className="font-semibold text-foreground mb-1">Frontness (left to right)</p>
                <p>Front vowels like "ee" (/i/) are produced with the tongue positioned forward in the mouth. Back vowels like "oo" (/u/) are produced with the tongue retracted. This affects the second formant (F2) frequency.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Openness (bottom to top)</p>
                <p>Open vowels like "ah" (/a/) have a wide mouth opening with the jaw lowered. Closed vowels like "ee" (/i/) have a narrow opening with the jaw raised. This primarily affects the first formant (F1) frequency.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Brightness Scale</p>
                <p>Brightness reflects the spectral energy distribution. Bright vowels like "ee" (/i/) have energy concentrated in higher frequencies, creating a brighter timbre. Dark vowels like "oo" (/u/) have energy in lower frequencies, creating a darker, more resonant timbre. Space weather conditions map to brightness: high temperature and density create brighter vowels, while low values create darker vowels.</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


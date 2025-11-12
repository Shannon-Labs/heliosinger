import { VOWEL_FORMANTS, type VowelName, type VowelFormants } from "@/lib/vowel-filters";

interface MiniVowelChartProps {
  currentVowel?: VowelName;
  currentVowelData?: {
    name: VowelName;
    displayName: string;
    openness: number;
    frontness: number;
    brightness: number;
  };
}

/**
 * Compact vowel chart for displaying in the main Heliosinger controls section
 * Shows vowel position without detailed descriptions
 */
export function MiniVowelChart({ currentVowel, currentVowelData }: MiniVowelChartProps) {
  const vowels = Object.values(VOWEL_FORMANTS);
  
  // Compact dimensions
  const chartWidth = 200;
  const chartHeight = 150;
  const padding = 30;

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

  if (!currentVowelData) {
    return null;
  }

  return (
    <div className="flex flex-col items-center">
      {/* Compact SVG Chart */}
      <svg 
        width={chartWidth} 
        height={chartHeight} 
        className="border border-border rounded-lg bg-background/50"
      >
        {/* Grid pattern */}
        <defs>
          <pattern id="mini-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mini-grid)" />

        {/* Axes */}
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={chartWidth - padding}
          y2={chartHeight - padding}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.2"
        />
        <line
          x1={padding}
          y1={chartHeight - padding}
          x2={padding}
          y2={padding}
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.2"
        />

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
                r={isCurrent ? 8 : 5}
                fill={isCurrent ? color : `${color}80`}
                stroke={isCurrent ? "currentColor" : "none"}
                strokeWidth={isCurrent ? 2 : 0}
                className={isCurrent ? "animate-pulse" : ""}
                opacity={isCurrent ? 1 : 0.6}
              />
              {/* Vowel label */}
              <text
                x={pos.x}
                y={pos.y - (isCurrent ? 12 : 8)}
                textAnchor="middle"
                className={`text-[10px] font-bold ${isCurrent ? "fill-foreground" : "fill-muted-foreground"}`}
              >
                {vowel.displayName}
              </text>
            </g>
          );
        })}

        {/* Current vowel highlight ring */}
        {currentVowelData && (() => {
          const vowel = vowels.find(v => v.name === currentVowel);
          if (!vowel) return null;
          const pos = getVowelPosition(vowel);
          return (
            <circle
              cx={pos.x}
              cy={pos.y}
              r={12}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              opacity="0.4"
              className="animate-pulse"
            />
          );
        })()}
      </svg>

      {/* Current vowel info */}
      <div className="mt-2 text-center">
        <div className="text-sm font-semibold">
          {currentVowelData.displayName}
          {VOWEL_FORMANTS[currentVowelData.name] && (
            <span className="text-xs text-muted-foreground ml-1">
              {VOWEL_FORMANTS[currentVowelData.name].ipaSymbol}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


import { useMemo } from 'react';
import type { VowelFormants } from '@/lib/vowel-filters';

interface VocalTractDiagramProps {
  vowel: VowelFormants;
  frequency?: number;
}

export function VocalTractDiagram({ vowel, frequency }: VocalTractDiagramProps) {
  const diagramData = useMemo(() => {
    // Map vowel properties to visual parameters
    const mouthOpening = vowel.openness; // 0 = closed, 1 = open
    const tonguePosition = vowel.frontness; // 0 = back, 1 = front
    const brightness = vowel.brightness; // 0 = dark, 1 = bright

    // Calculate mouth shape
    const mouthWidth = 60 + (mouthOpening * 40); // 60-100px
    const mouthHeight = 10 + (mouthOpening * 30); // 10-40px

    // Calculate tongue position
    const tongueX = 50 + (tonguePosition * 30); // 50-80% of width
    const tongueY = 60 - (mouthOpening * 20); // Adjust based on mouth opening
    const tongueWidth = 15 + (tonguePosition * 10); // Narrower when front

    // Calculate formant visualization
    const f1Height = Math.min(100, (vowel.formants[0] / 1000) * 100);
    const f2Height = Math.min(100, (vowel.formants[1] / 2500) * 100);

    return {
      mouthWidth,
      mouthHeight,
      tongueX,
      tongueY,
      tongueWidth,
      f1Height,
      f2Height,
      brightness,
    };
  }, [vowel]);

  return (
    <div className="space-y-4">
      {/* Vocal Tract SVG */}
      <div className="flex justify-center">
        <svg
          width="200"
          height="150"
          viewBox="0 0 200 150"
          className="border border-border rounded-lg bg-background/50"
        >
          {/* Mouth outline */}
          <ellipse
            cx="100"
            cy="120"
            rx={diagramData.mouthWidth / 2}
            ry={diagramData.mouthHeight / 2}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            opacity="0.3"
            className="text-muted-foreground"
          />

          {/* Tongue */}
          <ellipse
            cx={diagramData.tongueX}
            cy={diagramData.tongueY}
            rx={diagramData.tongueWidth / 2}
            ry="8"
            fill={`hsl(${200 + diagramData.brightness * 60}, 70%, ${50 + diagramData.brightness * 20}%)`}
            opacity="0.8"
          />

          {/* Formant visualization (spectral peaks) */}
          <g opacity="0.6">
            {/* F1 peak */}
            <line
              x1="50"
              y1="30"
              x2="50"
              y2={30 + diagramData.f1Height}
              stroke="hsl(191, 100%, 42%)"
              strokeWidth="3"
            />
            <circle
              cx="50"
              cy={30 + diagramData.f1Height}
              r="4"
              fill="hsl(191, 100%, 42%)"
            />
            <text
              x="50"
              y="25"
              textAnchor="middle"
              className="text-[8px] fill-muted-foreground"
            >
              F1
            </text>

            {/* F2 peak */}
            <line
              x1="150"
              y1="30"
              x2="150"
              y2={30 + diagramData.f2Height}
              stroke="hsl(67, 100%, 50%)"
              strokeWidth="3"
            />
            <circle
              cx="150"
              cy={30 + diagramData.f2Height}
              r="4"
              fill="hsl(67, 100%, 50%)"
            />
            <text
              x="150"
              y="25"
              textAnchor="middle"
              className="text-[8px] fill-muted-foreground"
            >
              F2
            </text>
          </g>

          {/* Labels */}
          <text
            x="100"
            y="140"
            textAnchor="middle"
            className="text-[10px] fill-muted-foreground"
          >
            {vowel.displayName} /{vowel.ipaSymbol}/
          </text>
        </svg>
      </div>

      {/* Description */}
      <div className="text-xs text-muted-foreground space-y-1 text-center">
        <p>
          <strong>Tongue position:</strong>{' '}
          {vowel.frontness > 0.6 ? 'Forward' : vowel.frontness < 0.4 ? 'Back' : 'Central'}
        </p>
        <p>
          <strong>Mouth opening:</strong>{' '}
          {vowel.openness > 0.6 ? 'Open' : vowel.openness < 0.4 ? 'Closed' : 'Mid'}
        </p>
        <p>
          <strong>Formants:</strong> F1={vowel.formants[0]} Hz, F2={vowel.formants[1]} Hz
        </p>
      </div>
    </div>
  );
}


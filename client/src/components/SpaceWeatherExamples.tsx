import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Example {
  title: string;
  condition: 'quiet' | 'moderate' | 'storm' | 'extreme';
  description: string;
  soundDescription: string;
  metrics: {
    velocity: number;
    density: number;
    bz: number;
    kp: number;
  };
  whatChanges: string[];
}

const examples: Example[] = [
  {
    title: 'Quiet Day',
    condition: 'quiet',
    description: 'Calm solar wind conditions with low geomagnetic activity',
    soundDescription: 'Low, steady pitch with a relaxed "ah" or "oh" vowel sound. The sun sings gently and slowly.',
    metrics: {
      velocity: 350,
      density: 3.0,
      bz: 2.0,
      kp: 2,
    },
    whatChanges: [
      'Lower pitch (slower solar wind)',
      'More open vowel sounds ("ah", "oh")',
      'Slower rhythm (low K-index)',
      'Narrower stereo field',
    ],
  },
  {
    title: 'Moderate Activity',
    condition: 'moderate',
    description: 'Normal solar wind with occasional fluctuations',
    soundDescription: 'Mid-range pitch with balanced vowel sounds. The sun sings with moderate energy.',
    metrics: {
      velocity: 450,
      density: 5.0,
      bz: -3.0,
      kp: 4,
    },
    whatChanges: [
      'Medium pitch range',
      'Mixed vowel sounds',
      'Moderate rhythm',
      'Balanced stereo positioning',
    ],
  },
  {
    title: 'Geomagnetic Storm',
    condition: 'storm',
    description: 'Active solar wind with southward Bz causing geomagnetic disturbances',
    soundDescription: 'Higher pitch with dramatic front vowels ("ee", "eh"). The sun sings urgently with wide stereo spread.',
    metrics: {
      velocity: 600,
      density: 8.0,
      bz: -15.0,
      kp: 6,
    },
    whatChanges: [
      'Higher pitch (faster solar wind)',
      'Front vowels ("ee", "eh") - more dramatic',
      'Faster rhythm (high K-index)',
      'Wider stereo field (southward Bz)',
      'More harmonics (richer sound)',
    ],
  },
  {
    title: 'Extreme Event',
    condition: 'extreme',
    description: 'Severe space weather with very high activity',
    soundDescription: 'Very high pitch with bright, intense vowel sounds. The sun sings powerfully with maximum harmonics and effects.',
    metrics: {
      velocity: 750,
      density: 15.0,
      bz: -25.0,
      kp: 8,
    },
    whatChanges: [
      'Highest pitch (very fast solar wind)',
      'Brightest vowels ("ee")',
      'Fastest rhythm (very high K-index)',
      'Maximum stereo width',
      'Maximum harmonics and reverb',
      'Additional texture layers (shimmer, rumble)',
    ],
  },
];

const getConditionColor = (condition: string) => {
  switch (condition) {
    case 'quiet':
      return 'bg-green-500/20 text-green-500 border-green-500/30';
    case 'moderate':
      return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
    case 'storm':
      return 'bg-orange-500/20 text-orange-500 border-orange-500/30';
    case 'extreme':
      return 'bg-red-500/20 text-red-500 border-red-500/30';
    default:
      return 'bg-muted/20 text-muted-foreground';
  }
};

export function SpaceWeatherExamples() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <i className="fas fa-graduation-cap text-primary" />
          What You're Listening For
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-6">
          Learn what different space weather conditions sound like. As conditions change,
          you'll hear the sun's voice transform in pitch, vowel, rhythm, and spatial positioning.
        </p>
        
        <Accordion type="single" collapsible className="w-full">
          {examples.map((example, index) => (
            <AccordionItem key={example.title} value={`example-${index}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <Badge className={getConditionColor(example.condition)}>
                    {example.title}
                  </Badge>
                  <span className="text-sm font-medium">{example.description}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Sound Description</h4>
                    <p className="text-sm text-muted-foreground">{example.soundDescription}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Typical Metrics</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">Velocity</div>
                        <div className="font-mono font-bold">{example.metrics.velocity} km/s</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Density</div>
                        <div className="font-mono font-bold">{example.metrics.density} p/cm³</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Bz</div>
                        <div className="font-mono font-bold">{example.metrics.bz} nT</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">K-index</div>
                        <div className="font-mono font-bold">Kp {example.metrics.kp}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm mb-2">What Changes in the Sound</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {example.whatChanges.map((change, i) => (
                        <li key={i}>{change}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        
        <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Tip:</strong> Enable Heliosinger mode and listen as conditions change.
            Watch the visualizations to see which metrics are changing, and notice how the sound responds.
            The sun's voice is a real-time translation of space weather physics into sound.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HeliosingerGuide() {
  return (
    <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <i className="fas fa-book-open text-primary text-lg" aria-hidden="true" />
          </div>
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            How Heliosinger Works
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pitch Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <i className="fas fa-music text-primary text-sm" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg">Pitch (Solar Wind Velocity)</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            The sun's voice rises and falls with solar wind speed. <strong>Higher pitch = faster solar wind</strong>.
            Velocity ranges from 200-800 km/s, mapped to musical notes C2-C6 across a pentatonic scale.
          </p>
          <div className="ml-10 flex gap-2 flex-wrap">
            <Badge variant="outline">200 km/s → C2 (65 Hz)</Badge>
            <Badge variant="outline">400 km/s → C4 (262 Hz)</Badge>
            <Badge variant="outline">800 km/s → C6 (1047 Hz)</Badge>
          </div>
        </div>

        {/* Vowel Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <i className="fas fa-comments text-accent text-sm" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg">Vowel (Density + Temperature + Bz + Velocity)</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            The sun's "vocal tract" shapes different vowels based on multiple plasma conditions:
          </p>
          <div className="ml-10 space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">Density</Badge>
              <span className="text-muted-foreground">→ Controls openness: High density = closed vowels (<strong>"ee"</strong>, <strong>"i"</strong>), Low density = open vowels (<strong>"ah"</strong>, <strong>"oh"</strong>)</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">Temperature + Velocity</Badge>
              <span className="text-muted-foreground">→ Controls brightness: High temp/fast wind = bright vowels (<strong>"I"</strong>), Low temp/slow wind = dark vowels (<strong>"U"</strong>)</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">Bz (Magnetic Field)</Badge>
              <span className="text-muted-foreground">→ Controls frontness: Southward Bz = front vowels (<strong>"I"</strong>, <strong>"E"</strong>), Northward Bz = back vowels (<strong>"O"</strong>, <strong>"U"</strong>), Near zero = central (<strong>"A"</strong>)</span>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5">Kp (Activity)</Badge>
              <span className="text-muted-foreground">→ Adds variability: Higher Kp introduces more random vowel shifts during active periods</span>
            </div>
          </div>
        </div>

        {/* Stereo Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <i className="fas fa-volume-up text-purple-500 text-sm" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg">Stereo Spread (Bz Magnetic Field)</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            The sun's voice moves through space based on magnetic field direction. 
            <strong> Southward Bz</strong> creates wider stereo separation and audible beating, 
            while <strong>northward Bz</strong> keeps the voice centered and stable.
          </p>
        </div>

        {/* Rhythm Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <i className="fas fa-wave-square text-orange-500 text-sm" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg">Rhythm (K-index)</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            Geomagnetic activity adds rhythm to the sun's song. <strong>Higher Kp values</strong> create faster tremolo 
            and more animated vowel changes, while <strong>quiet conditions</strong> (Kp 0-2) produce steady, calm singing.
          </p>
          <div className="ml-10 flex gap-2 flex-wrap">
            <Badge variant="outline" className="bg-green-500/10">Kp 0-2: Slow, steady</Badge>
            <Badge variant="outline" className="bg-yellow-500/10">Kp 3-4: Moderate rhythm</Badge>
            <Badge variant="outline" className="bg-orange-500/10">Kp 5-6: Fast pulsing</Badge>
            <Badge variant="outline" className="bg-red-500/10">Kp 7+: Intense, chaotic</Badge>
          </div>
        </div>

        {/* Harmonics Section */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <i className="fas fa-layer-group text-blue-500 text-sm" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg">Harmonics (Density + Temperature)</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            Rich harmonic content reflects plasma complexity. <strong>More particles</strong> and <strong>higher temperatures</strong> 
            create richer harmonic series with more partials, giving the sun's voice depth and character.
          </p>
        </div>

        {/* Chord Harmony Section */}
        <div className="space-y-3 pt-4 border-t border-border/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <i className="fas fa-guitar text-purple-500 text-sm" aria-hidden="true" />
            </div>
            <h3 className="font-semibold text-lg">Chord Harmony (Temperature + Density + Bz + Condition)</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-10">
            The sun's voice includes harmonic chords that reflect the complexity of space weather conditions:
          </p>
          <div className="ml-10 space-y-3 text-sm">
            <div className="bg-primary/5 rounded-lg p-3 space-y-2">
              <div className="font-semibold text-primary">Chord Construction</div>
              <p className="text-muted-foreground">
                Chords are built using Western tertian harmony principles—stacking intervals of thirds (major 3rd = 4 semitones, minor 3rd = 3 semitones). 
                Simple triads contain three notes (root, 3rd, 5th), while extended chords add 7ths, 9ths, or other tensions. 
                The interval ratios create consonant or dissonant sounds that reflect space weather conditions.
              </p>
            </div>
            <div className="bg-accent/5 rounded-lg p-3 space-y-2">
              <div className="font-semibold text-accent">Physics Mapping</div>
              <p className="text-muted-foreground">
                <strong>Temperature</strong> determines major/minor quality (≥100,000K = Major, &lt;100,000K = Minor). 
                <strong>Density</strong> controls harmonic richness (low &lt;5 p/cm³ = simple triads, medium 5-20 = 6th/7th chords, high &gt;20 = extended 9th chords). 
                <strong>Bz (magnetic field)</strong> adds tensions—southward Bz (&lt;-5 nT) creates dissonant extensions like minor 7ths. 
                <strong>Condition</strong> (quiet/storm/extreme) influences chord complexity—extreme conditions create dissonant intervals like minor 2nds or tritones.
              </p>
            </div>
            <div className="bg-destructive/5 rounded-lg p-3 space-y-2">
              <div className="font-semibold text-destructive">Musical Mapping</div>
              <p className="text-muted-foreground italic">
                These mappings are creative interpretations that translate physical parameters into musical language. 
                The thresholds (like 100,000K for major/minor) are aesthetic choices designed to create meaningful musical variation. 
                Major chords sound "resolved" and stable, reflecting quiet conditions, while minor chords create tension and drama for active periods. 
                Extended chords and dissonances add complexity and urgency during storms and extreme events.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground italic">
            Each moment in space weather creates a unique sung note. The sun literally sings its story in real-time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}


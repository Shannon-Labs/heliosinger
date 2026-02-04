import { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { debugLog } from '@/lib/debug';
import type { ChordTone } from '@/lib/heliosinger-mapping';

interface MusicStaffProps {
  chordVoicing: ChordTone[];
  clef?: 'treble' | 'bass';
}

/**
 * Convert note name from "C4" or "Eb4" format to VexFlow format "c/4" or "eb/4"
 */
function convertToVexFlowNote(noteName: string): string {
  // Extract note and octave: "C4" -> ["C", "4"], "Eb4" -> ["Eb", "4"]
  const match = noteName.match(/([A-G][#b]?)(\d+)/);
  if (!match) return noteName;

  const [, note, octave] = match;
  // Convert to lowercase and add slash: "C4" -> "c/4", "Eb4" -> "eb/4", "D#4" -> "d#/4"
  return `${note.toLowerCase()}/${octave}`;
}

export function MusicStaff({ chordVoicing, clef = 'treble' }: MusicStaffProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || chordVoicing.length === 0) return;

    // Dynamic import of VexFlow
    import('vexflow').then((VexFlow) => {
      const { Renderer, Stave, StaveNote, Voice, Formatter } = VexFlow;

      // Clear previous render
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Create renderer
      if (!containerRef.current) return;
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG);
      renderer.resize(400, 150);
      const ctx = renderer.getContext();
      rendererRef.current = renderer;

      // Create stave
      const stave = new Stave(10, 10, 380);
      stave.addClef(clef);
      stave.setContext(ctx).draw();

      // Convert chord tones to VexFlow notes
      const notes = chordVoicing.map((tone, index) => {
        const vexFlowNote = convertToVexFlowNote(tone.noteName);
        debugLog(`Converting ${tone.noteName} to VexFlow format: ${vexFlowNote}`);
        
        try {
          // Create note with appropriate styling
          const note = new StaveNote({
            clef: clef,
            keys: [vexFlowNote],
            duration: 'w' // Whole note
          });

          // Color-code: root note gets primary color, others get accent
          if (index === 0) {
            note.setStyle({ fillStyle: 'hsl(191, 100%, 42%)', strokeStyle: 'hsl(191, 100%, 42%)' });
          } else {
            note.setStyle({ fillStyle: 'hsl(67, 100%, 50%)', strokeStyle: 'hsl(67, 100%, 50%)' });
          }

          return note;
        } catch (error) {
          console.error(`Failed to create note for ${tone.noteName} (${vexFlowNote}):`, error);
          // Return a simple note as fallback
          return new StaveNote({
            clef: clef,
            keys: ['c/4'],
            duration: 'w'
          });
        }
      });

      // Create voice and format
      const voice = new Voice({ numBeats: 4, beatValue: 4 });
      voice.addTickables(notes);
      
      // Format notes to fit on staff
      try {
        new Formatter().joinVoices([voice]).format([voice], 350);
        
        // Draw notes
        voice.draw(ctx, stave);
        debugLog('Music staff rendered successfully');
      } catch (error) {
        console.error('Failed to format or draw notes:', error);
      }
    }).catch((error) => {
      console.error('Failed to load VexFlow:', error);
    });

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [chordVoicing, clef]);

  if (chordVoicing.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-background via-primary/5 to-accent/5 border-primary/20">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Chord on Staff</h3>
            <div className="text-xs text-muted-foreground">
              {clef === 'treble' ? 'Treble Clef' : 'Bass Clef'}
            </div>
          </div>
          <div 
            ref={containerRef} 
            className="w-full overflow-x-auto flex justify-center"
            style={{ minHeight: '150px' }}
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span>Root note</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-accent" />
                <span>Other notes</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import type { ChordData } from "@shared/schema";
import { midiNoteToFrequency, centsToFrequencyRatio } from "./midi-mapping";

interface AudioChime {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
}

class SolarWindAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeChimes: AudioChime[] = [];

  private async initializeAudio(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3; // Master volume
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private createChime(frequency: number, decayTime: number, detuneCents: number = 0): AudioChime {
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }

    // Apply detuning
    const detuneRatio = centsToFrequencyRatio(detuneCents);
    const detunedFrequency = frequency * detuneRatio;

    // Create oscillator for the main tone
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = detunedFrequency;

    // Create gain node for amplitude envelope
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;

    // Create filter for timbral control
    const filterNode = this.audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = Math.min(8000, detunedFrequency * 4);
    filterNode.Q.value = 1;

    // Connect nodes: oscillator -> filter -> gain -> master
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    return { oscillator, gainNode, filterNode };
  }

  private createChimeEnvelope(
    chime: AudioChime,
    decayTime: number,
    startTime: number
  ): void {
    if (!this.audioContext) return;

    const { gainNode, filterNode } = chime;
    const currentTime = this.audioContext.currentTime;

    // Attack phase (quick rise)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.8, startTime + 0.05);

    // Decay phase (exponential decay)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

    // Filter sweep for more natural sound
    filterNode.frequency.setValueAtTime(filterNode.frequency.value, startTime);
    filterNode.frequency.exponentialRampToValueAtTime(
      Math.max(200, filterNode.frequency.value * 0.3),
      startTime + decayTime
    );
  }

  private addBeatingEffect(
    baseFrequency: number,
    detuneCents: number,
    decayTime: number,
    startTime: number
  ): void {
    if (!this.audioContext || !this.masterGain || detuneCents === 0) return;

    // Create a slightly detuned oscillator for beating effect
    const beatOsc = this.audioContext.createOscillator();
    const beatGain = this.audioContext.createGain();
    const beatFilter = this.audioContext.createBiquadFilter();

    // Calculate beating frequency (typically 1-5 Hz for audible beating)
    const beatFrequency = baseFrequency * (1 + (detuneCents * 0.5) / 1200);
    
    beatOsc.type = 'sine';
    beatOsc.frequency.value = beatFrequency;

    beatFilter.type = 'lowpass';
    beatFilter.frequency.value = Math.min(4000, beatFrequency * 3);
    
    beatGain.gain.value = 0;

    // Connect beating oscillator
    beatOsc.connect(beatFilter);
    beatFilter.connect(beatGain);
    beatGain.connect(this.masterGain);

    // Envelope for beating effect
    beatGain.gain.setValueAtTime(0, startTime);
    beatGain.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
    beatGain.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.8);

    // Start and stop
    beatOsc.start(startTime);
    beatOsc.stop(startTime + decayTime);
  }

  public async playChord(chordData: ChordData): Promise<void> {
    try {
      await this.initializeAudio();
      
      if (!this.audioContext) {
        throw new Error("Failed to initialize audio context");
      }

      // Stop any currently playing chimes
      this.stopAllChimes();

      const startTime = this.audioContext.currentTime + 0.1; // Small delay for smooth start
      
      // Create main chime (velocity-based pitch)
      const mainChime = this.createChime(
        chordData.frequency,
        chordData.decayTime,
        chordData.detuneCents
      );
      this.activeChimes.push(mainChime);

      // Create harmonics based on space weather conditions
      const harmonics = this.generateHarmonics(chordData);
      harmonics.forEach((harmonic, index) => {
        const harmonicChime = this.createChime(
          harmonic.frequency,
          chordData.decayTime * harmonic.decayMultiplier,
          chordData.detuneCents * harmonic.detuneMultiplier
        );
        this.activeChimes.push(harmonicChime);
        
        // Stagger harmonic starts slightly
        this.createChimeEnvelope(harmonicChime, chordData.decayTime * harmonic.decayMultiplier, startTime + index * 0.02);
        harmonicChime.oscillator.start(startTime + index * 0.02);
        harmonicChime.oscillator.stop(startTime + chordData.decayTime * harmonic.decayMultiplier + 0.1);
      });

      // Main chime envelope and timing
      this.createChimeEnvelope(mainChime, chordData.decayTime, startTime);
      mainChime.oscillator.start(startTime);
      mainChime.oscillator.stop(startTime + chordData.decayTime + 0.1);

      // Add beating effect for geomagnetic activity
      if (chordData.detuneCents !== 0) {
        this.addBeatingEffect(chordData.frequency, chordData.detuneCents, chordData.decayTime, startTime);
      }

      // Clean up after chord finishes
      setTimeout(() => {
        this.stopAllChimes();
      }, (chordData.decayTime + 0.5) * 1000);

    } catch (error) {
      console.error("Audio playback failed:", error);
      throw error;
    }
  }

  private generateHarmonics(chordData: ChordData): Array<{
    frequency: number;
    decayMultiplier: number;
    detuneMultiplier: number;
  }> {
    const harmonics = [];
    const baseFreq = chordData.frequency;

    // Perfect fifth (1.5x frequency) - represents magnetic field strength
    harmonics.push({
      frequency: baseFreq * 1.5,
      decayMultiplier: 0.7,
      detuneMultiplier: 0.8
    });

    // Octave (2x frequency) - represents temperature component
    if (chordData.condition !== 'quiet') {
      harmonics.push({
        frequency: baseFreq * 2,
        decayMultiplier: 0.5,
        detuneMultiplier: 0.6
      });
    }

    // Sub-harmonic for storm conditions (creates deeper, more ominous sound)
    if (chordData.condition === 'storm') {
      harmonics.push({
        frequency: baseFreq * 0.5,
        decayMultiplier: 1.2,
        detuneMultiplier: 1.5
      });
    }

    return harmonics;
  }

  public stopAllChimes(): void {
    this.activeChimes.forEach(chime => {
      try {
        chime.oscillator.stop();
      } catch (error) {
        // Oscillator may already be stopped
      }
    });
    this.activeChimes = [];
  }

  public async testTone(frequency: number, duration: number = 1.0): Promise<void> {
    await this.initializeAudio();
    
    if (!this.audioContext || !this.masterGain) return;

    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.frequency.value = frequency;
    osc.type = 'sine';
    
    const now = this.audioContext.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.start(now);
    osc.stop(now + duration);
  }

  public dispose(): void {
    this.stopAllChimes();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.masterGain = null;
  }
}

// Global instance
const audioEngine = new SolarWindAudioEngine();

// Export main function for components
export const playChord = (chordData: ChordData): Promise<void> => {
  return audioEngine.playChord(chordData);
};

export const testTone = (frequency: number, duration?: number): Promise<void> => {
  return audioEngine.testTone(frequency, duration);
};

export const stopAudio = (): void => {
  audioEngine.stopAllChimes();
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioEngine.dispose();
  });
}

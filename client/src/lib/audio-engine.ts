import type { ChordData } from "@shared/schema";
import { midiNoteToFrequency, centsToFrequencyRatio } from "./midi-mapping.js";

interface AudioChime {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  // Enhanced for storm effects
  noiseBuffer?: AudioBuffer;
  noiseSource?: AudioBufferSourceNode;
  tremoloOsc?: OscillatorNode;
  tremoloGain?: GainNode;
  vibratoOsc?: OscillatorNode;
  rumbleOsc?: OscillatorNode;
  rumbleGain?: GainNode;
}

interface AmbientOscillator {
  oscillator: OscillatorNode;
  gainNode: GainNode;
  filterNode: BiquadFilterNode;
  vibratoOsc?: OscillatorNode;
  vibratoGain?: GainNode;
  frequencyTarget: number;
  gainTarget: number;
  filterTarget: number;
  detuneTarget: number;
}

class SolarWindAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeChimes: AudioChime[] = [];
  private noiseBuffer: AudioBuffer | null = null;
  
  // Ambient Mode properties
  private ambientMode: boolean = false;
  private ambientOscillators: AmbientOscillator[] = [];
  private ambientGain: GainNode | null = null;
  private smoothingConstant: number = 0.8; // Exponential smoothing factor
  private ambientVolume: number = 0.3;

  private async initializeAudio(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3; // Master volume
      
      // Create noise buffer for storm effects
      this.createNoiseBuffer();
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  private createNoiseBuffer(): void {
    if (!this.audioContext) return;
    
    // Create 1 second of white noise for storm effects
    const bufferSize = this.audioContext.sampleRate * 1.0;
    this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // White noise (-1 to 1)
    }
  }

  private getWaveformForCondition(condition: string): OscillatorType {
    switch (condition) {
      case 'quiet': return 'sine';
      case 'moderate': return 'sine';
      case 'storm': return 'sawtooth'; // Harsh waveform
      case 'extreme': return 'square'; // Very harsh waveform
      default: return 'sine';
    }
  }

  private getVolumeMultiplierForCondition(condition: string): number {
    switch (condition) {
      case 'quiet': return 1.0;
      case 'moderate': return 1.1;
      case 'storm': return 1.5; // Significantly louder
      case 'extreme': return 2.0; // Very loud and intimidating
      default: return 1.0;
    }
  }

  private createChime(
    frequency: number, 
    decayTime: number, 
    detuneCents: number = 0, 
    condition: string = 'quiet'
  ): AudioChime {
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }

    // Apply detuning
    const detuneRatio = centsToFrequencyRatio(detuneCents);
    const detunedFrequency = frequency * detuneRatio;

    // Create oscillator with waveform based on condition
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = this.getWaveformForCondition(condition);
    oscillator.frequency.value = detunedFrequency;

    // Create main gain node with volume scaling based on condition
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;

    // Create filter - more aggressive for storms
    const filterNode = this.audioContext.createBiquadFilter();
    if (condition === 'storm' || condition === 'extreme') {
      filterNode.type = 'bandpass'; // More aggressive filtering
      filterNode.frequency.value = Math.min(4000, detunedFrequency * 2);
      filterNode.Q.value = 8; // Higher resonance for harsh sound
    } else {
      filterNode.type = 'lowpass';
      filterNode.frequency.value = Math.min(8000, detunedFrequency * 4);
      filterNode.Q.value = 1;
    }

    // Basic audio chain: oscillator -> filter -> gain -> master
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);

    const chime: AudioChime = { oscillator, gainNode, filterNode };

    // Add storm-specific effects
    if (condition === 'storm' || condition === 'extreme') {
      this.addStormEffects(chime, detunedFrequency, condition);
    }

    // Connect final gain to master
    gainNode.connect(this.masterGain);

    return chime;
  }

  private addStormEffects(chime: AudioChime, frequency: number, condition: string): void {
    if (!this.audioContext || !this.masterGain) return;

    // Add tremolo (amplitude modulation) for storm conditions
    if (condition === 'storm' || condition === 'extreme') {
      const tremoloRate = condition === 'extreme' ? 8 : 4; // Hz
      chime.tremoloOsc = this.audioContext.createOscillator();
      chime.tremoloGain = this.audioContext.createGain();
      
      chime.tremoloOsc.type = 'sine';
      chime.tremoloOsc.frequency.value = tremoloRate;
      
      // Tremolo depth - more intense for extreme
      const tremoloDepth = condition === 'extreme' ? 0.6 : 0.3;
      chime.tremoloGain.gain.value = tremoloDepth;
      
      // Connect tremolo: tremoloOsc -> tremoloGain -> main gainNode.gain
      chime.tremoloOsc.connect(chime.tremoloGain);
      chime.tremoloGain.connect(chime.gainNode.gain);
    }

    // Add pitch vibrato for unstable sound
    if (condition === 'storm' || condition === 'extreme') {
      const vibratoRate = condition === 'extreme' ? 6 : 3; // Hz
      const vibratoDepth = condition === 'extreme' ? 15 : 8; // cents
      
      chime.vibratoOsc = this.audioContext.createOscillator();
      chime.vibratoOsc.type = 'sine';
      chime.vibratoOsc.frequency.value = vibratoRate;
      
      // Connect vibrato to main oscillator frequency
      const vibratoGain = this.audioContext.createGain();
      vibratoGain.gain.value = vibratoDepth;
      
      chime.vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(chime.oscillator.frequency);
    }

    // Add low-frequency rumble for extreme conditions
    if (condition === 'extreme') {
      chime.rumbleOsc = this.audioContext.createOscillator();
      chime.rumbleGain = this.audioContext.createGain();
      
      chime.rumbleOsc.type = 'sawtooth';
      chime.rumbleOsc.frequency.value = Math.random() * 40 + 40; // 40-80 Hz rumble
      
      chime.rumbleGain.gain.value = 0;
      
      // Connect rumble: rumbleOsc -> rumbleGain -> master
      chime.rumbleOsc.connect(chime.rumbleGain);
      chime.rumbleGain.connect(this.masterGain);
    }

    // Add noise burst for severe geomagnetic conditions
    if (condition === 'extreme' && this.noiseBuffer) {
      chime.noiseSource = this.audioContext.createBufferSource();
      chime.noiseSource.buffer = this.noiseBuffer;
      chime.noiseSource.loop = true;
      
      const noiseGain = this.audioContext.createGain();
      noiseGain.gain.value = 0;
      
      const noiseFilter = this.audioContext.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = frequency * 0.5; // Filter noise around lower frequency
      noiseFilter.Q.value = 4;
      
      // Connect noise: noiseSource -> noiseFilter -> noiseGain -> master
      chime.noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      
      // Store noise gain reference for envelope control
      (chime as any).noiseGain = noiseGain;
    }
  }

  private createChimeEnvelope(
    chime: AudioChime,
    decayTime: number,
    startTime: number,
    condition: string = 'quiet'
  ): void {
    if (!this.audioContext) return;

    const { gainNode, filterNode } = chime;
    const volumeMultiplier = this.getVolumeMultiplierForCondition(condition);

    // Attack phase - more aggressive for storms
    const attackTime = condition === 'extreme' ? 0.02 : condition === 'storm' ? 0.03 : 0.05;
    const peakLevel = 0.8 * volumeMultiplier;
    
    gainNode.gain.setValueAtTime(0, startTime);
    
    if (condition === 'extreme') {
      // Sudden, shocking attack for extreme conditions
      gainNode.gain.linearRampToValueAtTime(peakLevel, startTime + attackTime);
    } else if (condition === 'storm') {
      // Fast, aggressive attack for storms
      gainNode.gain.linearRampToValueAtTime(peakLevel, startTime + attackTime);
    } else {
      // Gentle attack for quiet/moderate conditions
      gainNode.gain.linearRampToValueAtTime(peakLevel, startTime + attackTime);
    }

    // Decay phase - different curves for different conditions
    if (condition === 'extreme') {
      // More complex decay with sustain for extreme conditions
      gainNode.gain.exponentialRampToValueAtTime(peakLevel * 0.6, startTime + decayTime * 0.3);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);
    } else {
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);
    }

    // Filter envelope - more dramatic for storms
    filterNode.frequency.setValueAtTime(filterNode.frequency.value, startTime);
    if (condition === 'storm' || condition === 'extreme') {
      // More dramatic filter sweep for storms
      filterNode.frequency.exponentialRampToValueAtTime(
        Math.max(100, filterNode.frequency.value * 0.1),
        startTime + decayTime
      );
    } else {
      filterNode.frequency.exponentialRampToValueAtTime(
        Math.max(200, filterNode.frequency.value * 0.3),
        startTime + decayTime
      );
    }

    // Handle storm-specific effect envelopes
    if (condition === 'storm' || condition === 'extreme') {
      this.createStormEffectEnvelopes(chime, decayTime, startTime, condition);
    }
  }

  private createStormEffectEnvelopes(
    chime: AudioChime,
    decayTime: number,
    startTime: number,
    condition: string
  ): void {
    if (!this.audioContext) return;

    // Start tremolo and vibrato oscillators
    if (chime.tremoloOsc) {
      chime.tremoloOsc.start(startTime);
      chime.tremoloOsc.stop(startTime + decayTime);
    }

    if (chime.vibratoOsc) {
      chime.vibratoOsc.start(startTime);
      chime.vibratoOsc.stop(startTime + decayTime);
    }

    // Handle rumble for extreme conditions
    if (chime.rumbleOsc && chime.rumbleGain && condition === 'extreme') {
      // Rumble envelope - builds up ominously
      chime.rumbleGain.gain.setValueAtTime(0, startTime);
      chime.rumbleGain.gain.linearRampToValueAtTime(0.4, startTime + 0.2);
      chime.rumbleGain.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 1.2);
      
      chime.rumbleOsc.start(startTime);
      chime.rumbleOsc.stop(startTime + decayTime * 1.2);
    }

    // Handle noise for extreme conditions
    const noiseGain = (chime as any).noiseGain as GainNode;
    if (chime.noiseSource && noiseGain && condition === 'extreme') {
      // Noise burst envelope - sharp attack, quick decay
      noiseGain.gain.setValueAtTime(0, startTime);
      noiseGain.gain.linearRampToValueAtTime(0.25, startTime + 0.05);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime * 0.3);
      
      chime.noiseSource.start(startTime);
      chime.noiseSource.stop(startTime + decayTime);
    }
  }

  private addWarningSirenEffect(frequency: number, decayTime: number, startTime: number): void {
    if (!this.audioContext || !this.masterGain) return;

    // Create a frequency-sweeping siren effect for extreme conditions
    const sirenOsc = this.audioContext.createOscillator();
    const sirenGain = this.audioContext.createGain();
    const sirenFilter = this.audioContext.createBiquadFilter();

    sirenOsc.type = 'sawtooth';
    sirenGain.gain.value = 0;
    
    sirenFilter.type = 'bandpass';
    sirenFilter.frequency.value = 800;
    sirenFilter.Q.value = 10;

    // Connect siren: osc -> filter -> gain -> master
    sirenOsc.connect(sirenFilter);
    sirenFilter.connect(sirenGain);
    sirenGain.connect(this.masterGain);

    // Frequency sweep - emergency siren pattern
    sirenOsc.frequency.setValueAtTime(frequency * 0.7, startTime);
    sirenOsc.frequency.exponentialRampToValueAtTime(frequency * 1.3, startTime + 0.4);
    sirenOsc.frequency.exponentialRampToValueAtTime(frequency * 0.7, startTime + 0.8);
    sirenOsc.frequency.exponentialRampToValueAtTime(frequency * 1.3, startTime + 1.2);
    sirenOsc.frequency.exponentialRampToValueAtTime(frequency * 0.7, startTime + decayTime);

    // Siren volume envelope
    sirenGain.gain.setValueAtTime(0, startTime);
    sirenGain.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
    sirenGain.gain.exponentialRampToValueAtTime(0.001, startTime + decayTime);

    sirenOsc.start(startTime);
    sirenOsc.stop(startTime + decayTime);
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
      const condition = chordData.condition;
      
      // Create main chime with condition-specific effects
      const mainChime = this.createChime(
        chordData.frequency,
        chordData.decayTime,
        chordData.detuneCents,
        condition
      );
      this.activeChimes.push(mainChime);

      // Create harmonics based on space weather conditions
      const harmonics = this.generateHarmonics(chordData);
      harmonics.forEach((harmonic, index) => {
        const harmonicChime = this.createChime(
          harmonic.frequency,
          chordData.decayTime * harmonic.decayMultiplier,
          chordData.detuneCents * harmonic.detuneMultiplier,
          condition
        );
        this.activeChimes.push(harmonicChime);
        
        // Stagger harmonic starts slightly
        this.createChimeEnvelope(
          harmonicChime, 
          chordData.decayTime * harmonic.decayMultiplier, 
          startTime + index * 0.02,
          condition
        );
        harmonicChime.oscillator.start(startTime + index * 0.02);
        harmonicChime.oscillator.stop(startTime + chordData.decayTime * harmonic.decayMultiplier + 0.1);
      });

      // Main chime envelope and timing with condition
      this.createChimeEnvelope(mainChime, chordData.decayTime, startTime, condition);
      mainChime.oscillator.start(startTime);
      mainChime.oscillator.stop(startTime + chordData.decayTime + 0.1);

      // Add beating effect for geomagnetic activity (enhanced for storms)
      if (chordData.detuneCents !== 0) {
        this.addBeatingEffect(chordData.frequency, chordData.detuneCents, chordData.decayTime, startTime);
      }

      // Add warning siren effect for extreme conditions
      if (condition === 'extreme') {
        this.addWarningSirenEffect(chordData.frequency, chordData.decayTime * 1.5, startTime + 0.2);
      }

      // Determine cleanup time based on condition (longer for extreme storms)
      const cleanupTime = condition === 'extreme' 
        ? (chordData.decayTime * 1.5 + 1.0) * 1000
        : (chordData.decayTime + 0.5) * 1000;

      // Clean up after chord finishes
      setTimeout(() => {
        this.stopAllChimes();
      }, cleanupTime);

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
        // Stop main oscillator
        chime.oscillator.stop();
      } catch (error) {
        // Oscillator may already be stopped
      }

      // Clean up storm effect oscillators
      try {
        if (chime.tremoloOsc) {
          chime.tremoloOsc.stop();
        }
      } catch (error) {
        // May already be stopped
      }

      try {
        if (chime.vibratoOsc) {
          chime.vibratoOsc.stop();
        }
      } catch (error) {
        // May already be stopped
      }

      try {
        if (chime.rumbleOsc) {
          chime.rumbleOsc.stop();
        }
      } catch (error) {
        // May already be stopped
      }

      try {
        if (chime.noiseSource) {
          chime.noiseSource.stop();
        }
      } catch (error) {
        // May already be stopped
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

  // Ambient Mode Methods
  public async startAmbient(chordData: ChordData, volume: number = 0.3, smoothing: number = 0.8): Promise<void> {
    await this.initializeAudio();
    
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }

    if (this.ambientMode) {
      this.stopAmbient();
    }

    this.ambientMode = true;
    this.ambientVolume = volume;
    this.smoothingConstant = smoothing;

    // Create ambient gain node
    this.ambientGain = this.audioContext.createGain();
    this.ambientGain.gain.value = volume;
    this.ambientGain.connect(this.masterGain);

    // Create persistent oscillators for ambient texture
    const baseFreq = chordData.frequency;
    const harmonicRatios = [1.0, 2.0, 3.0, 4.0]; // Fundamental + harmonics
    
    for (let i = 0; i < harmonicRatios.length; i++) {
      const freq = baseFreq * harmonicRatios[i];
      const ambientOsc = this.createAmbientOscillator(freq, chordData, i);
      this.ambientOscillators.push(ambientOsc);
    }

    console.log(`Started ambient mode: ${chordData.baseNote} at ${baseFreq}Hz, volume=${volume}`);
  }

  private createAmbientOscillator(frequency: number, chordData: ChordData, harmonicIndex: number): AmbientOscillator {
    if (!this.audioContext || !this.ambientGain) {
      throw new Error("Audio context not initialized");
    }

    // Create oscillator with appropriate waveform
    const oscillator = this.audioContext.createOscillator();
    oscillator.type = harmonicIndex === 0 ? 'sine' : 'triangle'; // Fundamental sine, harmonics triangle
    oscillator.frequency.value = frequency;

    // Create gain node with harmonic rolloff
    const gainNode = this.audioContext.createGain();
    const harmonicGain = harmonicIndex === 0 ? 0.8 : (0.4 / harmonicIndex); // Decrease gain for higher harmonics
    gainNode.gain.value = harmonicGain * this.ambientVolume;

    // Create filter for spectral shaping
    const filterNode = this.audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = frequency * 2; // Initial filter frequency
    filterNode.Q.value = 1.0;

    // Add vibrato for Bz effects if significant
    let vibratoOsc: OscillatorNode | undefined;
    let vibratoGain: GainNode | undefined;
    
    if (Math.abs(chordData.detuneCents) > 5) {
      vibratoOsc = this.audioContext.createOscillator();
      vibratoGain = this.audioContext.createGain();
      
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.value = 3 + Math.random() * 2; // 3-5 Hz vibrato
      vibratoGain.gain.value = Math.abs(chordData.detuneCents) * 0.5; // Vibrato depth based on Bz
      
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(oscillator.frequency);
      vibratoOsc.start();
    }

    // Connect audio chain
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.ambientGain);

    // Start oscillator
    oscillator.start();

    const ambientOsc: AmbientOscillator = {
      oscillator,
      gainNode,
      filterNode,
      vibratoOsc,
      vibratoGain,
      frequencyTarget: frequency,
      gainTarget: harmonicGain * this.ambientVolume,
      filterTarget: frequency * 2,
      detuneTarget: chordData.detuneCents
    };

    return ambientOsc;
  }

  public updateAmbient(chordData: ChordData): void {
    if (!this.ambientMode || !this.audioContext) return;

    const baseFreq = chordData.frequency;
    const harmonicRatios = [1.0, 2.0, 3.0, 4.0];

    this.ambientOscillators.forEach((ambientOsc, index) => {
      const targetFreq = baseFreq * harmonicRatios[index];
      const harmonicGain = index === 0 ? 0.8 : (0.4 / index);
      const targetGain = harmonicGain * this.ambientVolume;
      const targetFilter = targetFreq * (2 + chordData.density * 0.1); // Density affects filter cutoff
      
      // Apply exponential smoothing to prevent audio clicks
      const smoothingTime = 0.1; // 100ms smooth transition
      const now = this.audioContext!.currentTime;
      
      // Smooth frequency changes
      ambientOsc.frequencyTarget = this.exponentialSmooth(
        ambientOsc.frequencyTarget, 
        targetFreq, 
        this.smoothingConstant
      );
      ambientOsc.oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, ambientOsc.frequencyTarget), 
        now + smoothingTime
      );

      // Smooth gain changes
      ambientOsc.gainTarget = this.exponentialSmooth(
        ambientOsc.gainTarget,
        targetGain,
        this.smoothingConstant
      );
      ambientOsc.gainNode.gain.exponentialRampToValueAtTime(
        Math.max(0.001, ambientOsc.gainTarget),
        now + smoothingTime
      );

      // Smooth filter changes  
      ambientOsc.filterTarget = this.exponentialSmooth(
        ambientOsc.filterTarget,
        targetFilter,
        this.smoothingConstant
      );
      ambientOsc.filterNode.frequency.exponentialRampToValueAtTime(
        Math.max(100, Math.min(20000, ambientOsc.filterTarget)),
        now + smoothingTime
      );

      // Update vibrato based on Bz
      if (ambientOsc.vibratoGain && Math.abs(chordData.detuneCents) > 5) {
        const vibratoDepth = Math.abs(chordData.detuneCents) * 0.5;
        ambientOsc.vibratoGain.gain.exponentialRampToValueAtTime(
          Math.max(0.1, vibratoDepth),
          now + smoothingTime
        );
      }
    });
  }

  private exponentialSmooth(current: number, target: number, alpha: number): number {
    return current * alpha + target * (1 - alpha);
  }

  public stopAmbient(): void {
    if (!this.ambientMode) return;

    this.ambientMode = false;

    // Stop all ambient oscillators
    this.ambientOscillators.forEach(ambientOsc => {
      try {
        ambientOsc.oscillator.stop();
      } catch (error) {
        // Oscillator may already be stopped
      }
      
      if (ambientOsc.vibratoOsc) {
        try {
          ambientOsc.vibratoOsc.stop();
        } catch (error) {
          // May already be stopped
        }
      }
    });

    this.ambientOscillators = [];

    // Disconnect ambient gain
    if (this.ambientGain) {
      this.ambientGain.disconnect();
      this.ambientGain = null;
    }

    console.log("Stopped ambient mode");
  }

  public setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    
    if (this.ambientGain) {
      this.ambientGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, this.ambientVolume),
        this.audioContext!.currentTime + 0.1
      );
    }
  }

  public isAmbientActive(): boolean {
    return this.ambientMode;
  }

  public dispose(): void {
    this.stopAmbient();
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

// Export ambient mode functions
export const startAmbient = (chordData: ChordData, volume?: number, smoothing?: number): Promise<void> => {
  return audioEngine.startAmbient(chordData, volume, smoothing);
};

export const updateAmbient = (chordData: ChordData): void => {
  audioEngine.updateAmbient(chordData);
};

export const stopAmbient = (): void => {
  audioEngine.stopAmbient();
};

export const setAmbientVolume = (volume: number): void => {
  audioEngine.setAmbientVolume(volume);
};

export const isAmbientActive = (): boolean => {
  return audioEngine.isAmbientActive();
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    audioEngine.dispose();
  });
}

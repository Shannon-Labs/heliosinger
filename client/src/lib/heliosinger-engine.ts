/**
 * Heliosinger Audio Engine
 * 
 * Makes the sun literally sing space weather using vowel formant filters
 * and harmonic synthesis. The sun's "voice" changes based on solar wind
 * conditions, creating a poetic and scientifically accurate sonification.
 */

import type { HeliosingerData } from "./heliosinger-mapping";

interface ChordToneLayer {
  // Oscillator for this chord tone
  osc: OscillatorNode;
  oscGain: GainNode;
  
  // Formant filters (create vowel sounds) - one set per chord tone
  formantFilters: BiquadFilterNode[];
  formantGains: GainNode[];
  
  // Individual panner for stereo spread
  panner: StereoPannerNode;
}

interface HeliosingerLayer {
  // Chord tone layers (multiple notes for harmony)
  chordToneLayers: ChordToneLayer[];
  
  // Harmonic oscillators (add richness to the voice)
  harmonicOscs: OscillatorNode[];
  harmonicGains: GainNode[];
  
  // Master panner (for overall stereo positioning)
  masterPanner: StereoPannerNode;
}

interface ModulationLayer {
  // Vibrato (pitch modulation from Bz)
  vibratoLfo?: OscillatorNode;
  vibratoGain?: GainNode;
  
  // Tremolo (amplitude modulation from K-index)
  tremoloLfo?: OscillatorNode;
  tremoloGain?: GainNode;
}

interface TextureLayer {
  // High-frequency shimmer (from temperature)
  noiseSource?: AudioBufferSourceNode;
  noiseGain?: GainNode;
  noiseFilter?: BiquadFilterNode;
  
  // Solar Wind Hiss (velocity-driven)
  windSource?: AudioBufferSourceNode;
  windGain?: GainNode;
  windFilter?: BiquadFilterNode;
  
  // Sub-bass rumble (for extreme conditions)
  rumbleOsc?: OscillatorNode;
  rumbleGain?: GainNode;
}

interface BinauralLayer {
  leftOsc?: OscillatorNode;
  rightOsc?: OscillatorNode;
  leftGain?: GainNode;
  rightGain?: GainNode;
  leftPan?: StereoPannerNode;
  rightPan?: StereoPannerNode;
}

class HeliosingerEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private reverbConvolver: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  
  // Audio layers
  private heliosingerLayer: HeliosingerLayer | null = null;
  private modulationLayer: ModulationLayer = {};
  private textureLayer: TextureLayer = {};
  private binauralLayer: BinauralLayer = {};
  
  // State
  private isSinging: boolean = false;
  private currentData: HeliosingerData | null = null;
  private targetVolume: number = 0.3;
  private hasSetupStateHandler: boolean = false;
  private hasTriedUnlock: boolean = false;
  
  // Noise buffer for texture
  private noiseBuffer: AudioBuffer | null = null;
  
  /**
   * Ensure the AudioContext exists and is resumed. Lightweight and safe to call
   * directly inside a user gesture (pointerdown/touchstart) before any async work.
   */
  public async ensureUnlocked(): Promise<void> {
    try {
      if (!this.audioContext) {
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
          throw new Error('Web Audio API is not supported in this browser');
        }
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext && !this.hasSetupStateHandler) {
        this.audioContext.onstatechange = () => {
          console.log('AudioContext state:', this.audioContext?.state);
        };
        this.hasSetupStateHandler = true;
      }

      if (!this.audioContext) return;
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (e) {
          console.warn('AudioContext resume() during unlock failed:', e);
        }
      }

      // iOS unlock: 1-frame silent buffer
      try {
        const buffer = this.audioContext.createBuffer(1, 1, 22050);
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        const now = this.audioContext.currentTime;
        source.start(now);
        source.stop(now + 0.001);
        this.hasTriedUnlock = true;
        console.log('Played iOS unlock buffer (ensureUnlocked)');
      } catch (unlockError) {
        console.warn('Unlock buffer failed (non-critical):', unlockError);
      }
    } catch (error) {
      console.error('ensureUnlocked failed:', error);
      throw error instanceof Error ? error : new Error('Failed to unlock audio');
    }
  }

  private async initializeAudio(): Promise<void> {
    try {
      if (!this.audioContext) {
        // Check if AudioContext is supported
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
          throw new Error('Web Audio API is not supported in this browser');
        }

        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      // Attach state change logger once
      if (this.audioContext && !this.hasSetupStateHandler) {
        this.audioContext.onstatechange = () => {
          console.log('AudioContext state:', this.audioContext?.state);
        };
        this.hasSetupStateHandler = true;
      }

      // Build master chain only once
      if (!this.masterGain) {
        
        // Create master audio chain
        this.masterGain = this.audioContext.createGain();
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.limiter = this.audioContext.createDynamicsCompressor();
        
        // Configure compressor for overall balance
        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;
        
        // Configure limiter for protection during storms
        this.limiter.threshold.value = -6;
        this.limiter.knee.value = 1;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.1;
        
        // Create delay node (will be configured when starting)
        this.delayNode = this.audioContext.createDelay(1.0);
        this.delayGain = this.audioContext.createGain();
        this.delayFeedbackGain = this.audioContext.createGain();
        
        // Create reverb convolver (will be configured when starting)
        this.reverbConvolver = this.audioContext.createConvolver();
        this.reverbGain = this.audioContext.createGain();
        
        // Connect chain: masterGain -> delay -> reverb -> compressor -> limiter -> destination
        // Delay feedback loop: delay -> delayFeedbackGain -> delay (input)
        this.masterGain.connect(this.delayNode);
        this.delayNode.connect(this.delayGain);
        this.delayGain.connect(this.reverbConvolver);
        this.reverbConvolver.connect(this.reverbGain);
        this.reverbGain.connect(this.compressor);
        this.compressor.connect(this.limiter);
        this.limiter.connect(this.audioContext.destination);
        
        // Delay feedback
        this.delayNode.connect(this.delayFeedbackGain);
        this.delayFeedbackGain.connect(this.delayNode);
        
        // Set master volume
        this.masterGain.gain.value = this.targetVolume;
        
        // Create noise buffer for texture layer
        this.createNoiseBuffer();
        
        // Create reverb impulse response
        this.createReverbImpulse();
      }

      // Resume audio context if suspended (browser autoplay policy)
      // iOS requires this to happen synchronously during user interaction
      if (this.audioContext.state === 'suspended') {
        try {
          // On iOS, resume() must be called synchronously during user interaction
          const resumePromise = this.audioContext.resume();
          await resumePromise;
          
          // Double-check state after resume
          if (this.audioContext.state === 'suspended') {
            console.warn('Audio context still suspended after resume attempt');
            // Try one more time
            await this.audioContext.resume();
          }
          
          console.log(`Audio context state: ${this.audioContext.state}`);
          
          // iOS unlock: Play a very short silent buffer to unlock audio
          // This is sometimes needed on iOS Safari
          try {
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
            source.stop(0.001);
            console.log('Played iOS unlock buffer');
          } catch (unlockError) {
            // Ignore unlock errors, not critical
            console.warn('iOS unlock buffer failed (non-critical):', unlockError);
          }
        } catch (resumeError) {
          console.error('Failed to resume audio context:', resumeError);
          throw new Error('Audio requires user interaction. Please tap the play button to enable audio.');
        }
      }

      // Check if audio context is in a valid state
      if (this.audioContext.state === 'closed') {
        throw new Error('Audio context has been closed');
      }
      
      // Log audio context state for debugging
      console.log(`Audio context initialized: state=${this.audioContext.state}, sampleRate=${this.audioContext.sampleRate}Hz`);
      
      // Verify master gain is connected and has correct volume
      if (this.masterGain) {
        console.log(`Master gain: value=${this.masterGain.gain.value}, connected=${this.masterGain.numberOfOutputs > 0}`);
      }
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize audio system');
    }
  }
  
  private createNoiseBuffer(): void {
    if (!this.audioContext) return;
    
    // Create 2 seconds of white noise
    const bufferSize = this.audioContext.sampleRate * 2.0;
    this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }
  
  /**
   * Create a simple reverb impulse response
   * Generates a decaying noise burst for natural reverb
   */
  private createReverbImpulse(): void {
    if (!this.audioContext || !this.reverbConvolver) return;
    
    // Create 2 second impulse response
    const length = this.audioContext.sampleRate * 2.0;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    
    // Generate decaying noise for both channels
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - (i / length), 2); // Exponential decay
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
      }
    }
    
    this.reverbConvolver.buffer = impulse;
  }
  
  /**
   * Start the sun singing!
   */
  public async startSinging(heliosingerData: HeliosingerData): Promise<void> {
    await this.initializeAudio();
    
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }
    
    // Stop if already singing
    if (this.isSinging) {
      this.stopSinging();
    }
    
    this.isSinging = true;
    this.currentData = heliosingerData;
    
    // Ensure volume is set before starting (critical for mobile/iOS/Android)
    if (this.masterGain) {
      const targetVol = Math.max(0.001, this.targetVolume);
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(targetVol, now);
      console.log(`Set master gain to ${(targetVol * 100).toFixed(0)}% before starting audio`);
    }
    
    // Configure reverb and delay
    this.configureReverbDelay(heliosingerData);
    
    // Create the main Heliosinger layer (the sun's voice with chord voicing)
    this.heliosingerLayer = this.createHeliosingerLayer(heliosingerData);
    
    // Create modulation layer (vibrato, tremolo)
    this.createModulationLayer(heliosingerData);

    // Create binaural layer for calm background presence
    this.createBinauralLayer(heliosingerData);
    
    // Create texture layer (shimmer, rumble, wind)
    this.createTextureLayer(heliosingerData);
    
    console.log(`🌞 The sun is singing: "${heliosingerData.solarMood}"`);
    console.log(`   Vowel: "${heliosingerData.currentVowel.displayName}" (${heliosingerData.currentVowel.description})`);
    console.log(`   Note: ${heliosingerData.baseNote} at ${heliosingerData.frequency.toFixed(1)}Hz`);
    console.log(`   Harmonics: ${heliosingerData.harmonicCount} partials`);
    console.log(`   Condition: ${heliosingerData.condition}`);
    console.log(`   Volume: ${(this.targetVolume * 100).toFixed(0)}%`);
  }
  
  /**
   * Configure reverb and delay effects
   */
  private configureReverbDelay(data: HeliosingerData): void {
    if (!this.audioContext || !this.delayNode || !this.delayGain || !this.delayFeedbackGain || !this.reverbGain) return;
    
    const now = this.audioContext.currentTime;
    
    // Configure delay
    this.delayNode.delayTime.value = data.delayTime;
    this.delayGain.gain.value = data.delayGain; // Wet signal
    this.delayFeedbackGain.gain.value = data.delayFeedback; // Feedback amount
    
    // Configure reverb (room size affects gain)
    this.reverbGain.gain.value = data.reverbRoomSize * 0.3; // Subtle reverb (wet/dry mix)
  }
  
  /**
   * Create the main Heliosinger layer - the sun's singing voice with chord voicing
   */
  private createHeliosingerLayer(data: HeliosingerData): HeliosingerLayer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }
    
    const layer: HeliosingerLayer = {
      chordToneLayers: [],
      harmonicOscs: [],
      harmonicGains: [],
      masterPanner: this.audioContext.createStereoPanner()
    };
    
    // Create a chord tone layer for each note in the chord voicing
    data.chordVoicing.forEach((chordTone, toneIndex) => {
      const toneLayer: ChordToneLayer = {
        osc: this.audioContext!.createOscillator(),
        oscGain: this.audioContext!.createGain(),
        formantFilters: [],
        formantGains: [],
        panner: this.audioContext!.createStereoPanner()
      };
      
      // Configure oscillator (the sun's vocal cords for this chord tone)
      toneLayer.osc.type = 'sawtooth'; // Rich in harmonics, like a voice
      toneLayer.osc.frequency.value = chordTone.frequency;
      
      // Set gain based on amplitude (fundamental is loudest)
      // Increased from 0.4 to 0.7 to make vowels more audible
      toneLayer.oscGain.gain.value = chordTone.amplitude * 0.7;
      
      // Create formant filters for this chord tone (apply vowel shape to each note)
      // Formants are connected in parallel to emphasize vowel characteristics
      data.formantFilters.forEach((formant, i) => {
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = formant.frequency;
        // Q value determines filter sharpness - higher Q = more focused on formant frequency
        filter.Q.value = formant.frequency / formant.bandwidth;
        
        const gain = this.audioContext!.createGain();
        // Use the gain from formant calculation (now boosted for clarity)
        gain.gain.value = formant.gain;
        
        toneLayer.formantFilters.push(filter);
        toneLayer.formantGains.push(gain);
        
        // Connect: filter -> gain
        filter.connect(gain);
      });
      
      // Configure stereo panning for this chord tone
      // Spread chord tones slightly across stereo field
      const panSpread = (data.stereoSpread - 0.5) * 2;
      const tonePanOffset = (toneIndex - (data.chordVoicing.length - 1) / 2) * 0.2;
      toneLayer.panner.pan.value = Math.max(-1, Math.min(1, panSpread * 0.7 + tonePanOffset));
      
      // Connect: osc -> oscGain -> [Formant Filters in parallel] -> tonePanner -> masterPanner -> master
      toneLayer.osc.connect(toneLayer.oscGain);
      toneLayer.formantFilters.forEach((filter, i) => {
        toneLayer.oscGain.connect(filter);
        toneLayer.formantGains[i].connect(toneLayer.panner);
      });
      toneLayer.panner.connect(layer.masterPanner);
      
      // Start oscillator (must happen synchronously on iOS)
      try {
        toneLayer.osc.start();
        console.log(`Started chord tone oscillator: ${chordTone.frequency}Hz, gain=${toneLayer.oscGain.gain.value}`);
      } catch (error) {
        console.error(`Failed to start oscillator:`, error);
        throw error;
      }
      
      layer.chordToneLayers.push(toneLayer);
    });
    
    // Create harmonic oscillators (adds richness to the voice)
    data.harmonicAmplitudes.forEach((amplitude, i) => {
      if (i === 0) return; // Skip fundamental, we already have it in chord voicing
      
      const harmonicNumber = i + 1;
      const harmonicFreq = data.frequency * harmonicNumber;
      
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine'; // Pure harmonics
      osc.frequency.value = harmonicFreq;
      
      const gain = this.audioContext!.createGain();
      gain.gain.value = amplitude * 0.2; // Scale down harmonics
      
      layer.harmonicOscs.push(osc);
      layer.harmonicGains.push(gain);
      
      // Connect: osc -> gain -> masterPanner
      osc.connect(gain);
      gain.connect(layer.masterPanner);
    });
    
    // Configure master stereo panning
    const panSpread = (data.stereoSpread - 0.5) * 2;
    layer.masterPanner.pan.value = panSpread * 0.3; // Subtle overall pan
    
    // Connect master panner to master gain
    layer.masterPanner.connect(this.masterGain);
    
    // Start harmonic oscillators
    layer.harmonicOscs.forEach(osc => {
      try {
        osc.start();
        console.log(`Started harmonic oscillator at ${osc.frequency.value.toFixed(1)}Hz`);
      } catch (error) {
        console.error(`Failed to start harmonic oscillator:`, error);
      }
    });
    
    // Log audio graph for debugging (especially important for mobile)
    console.log(`Created Heliosinger layer: ${layer.chordToneLayers.length} chord tones, ${layer.harmonicOscs.length} harmonics`);
    console.log(`Master gain: value=${this.masterGain.gain.value.toFixed(3)}, connected=${this.masterGain.numberOfOutputs > 0}`);
    console.log(`Audio context state: ${this.audioContext.state}, sampleRate: ${this.audioContext.sampleRate}Hz`);
    
    return layer;
  }
  
  /**
   * Create modulation layer (vibrato, tremolo)
   */
  private createModulationLayer(data: HeliosingerData): void {
    if (!this.audioContext || !this.heliosingerLayer) return;
    
    // Create vibrato LFO (pitch modulation from Bz)
    if (data.vibratoDepth > 0) {
      this.modulationLayer.vibratoLfo = this.audioContext.createOscillator();
      this.modulationLayer.vibratoGain = this.audioContext.createGain();
      
      this.modulationLayer.vibratoLfo.type = 'sine';
      this.modulationLayer.vibratoLfo.frequency.value = data.vibratoRate;
      this.modulationLayer.vibratoGain.gain.value = data.vibratoDepth;
      
      // Connect vibrato to all chord tone frequencies
      this.modulationLayer.vibratoLfo.connect(this.modulationLayer.vibratoGain);
      this.heliosingerLayer.chordToneLayers.forEach(toneLayer => {
        this.modulationLayer.vibratoGain!.connect(toneLayer.osc.frequency);
      });
      
      // Also connect to harmonic frequencies
      this.heliosingerLayer.harmonicOscs.forEach(osc => {
        this.modulationLayer.vibratoGain!.connect(osc.frequency);
      });
      
      try {
        this.modulationLayer.vibratoLfo.start();
        console.log(`Started vibrato LFO at ${this.modulationLayer.vibratoLfo.frequency.value.toFixed(2)}Hz`);
      } catch (error) {
        console.error(`Failed to start vibrato LFO:`, error);
      }
    }
    
    // Create tremolo LFO (amplitude modulation from K-index)
    if (data.tremoloDepth > 0.05) {
      this.modulationLayer.tremoloLfo = this.audioContext.createOscillator();
      this.modulationLayer.tremoloGain = this.audioContext.createGain();
      
      this.modulationLayer.tremoloLfo.type = data.tremoloRate > 4 ? 'square' : 'sine';
      this.modulationLayer.tremoloLfo.frequency.value = data.tremoloRate;
      this.modulationLayer.tremoloGain.gain.value = data.tremoloDepth * 0.5; // Reduced for vocals
      
      // Connect tremolo to formant gains (creates rhythmic vowel effect)
      this.modulationLayer.tremoloLfo.connect(this.modulationLayer.tremoloGain);
      this.heliosingerLayer.chordToneLayers.forEach(toneLayer => {
        toneLayer.formantGains.forEach(gain => {
          this.modulationLayer.tremoloGain!.connect(gain.gain);
        });
      });
      
      try {
        this.modulationLayer.tremoloLfo.start();
        console.log(`Started tremolo LFO at ${this.modulationLayer.tremoloLfo.frequency.value.toFixed(2)}Hz`);
      } catch (error) {
        console.error(`Failed to start tremolo LFO:`, error);
      }
    }
  }

  /**
   * Calming binaural beat layer to keep the experience soothing in the background.
   */
  private createBinauralLayer(data: HeliosingerData): void {
    if (!this.audioContext || !this.masterGain) return;

    // Clean up any previous layer first
    if (this.binauralLayer.leftOsc) {
      try { this.binauralLayer.leftOsc.stop(); } catch (e) {}
    }
    if (this.binauralLayer.rightOsc) {
      try { this.binauralLayer.rightOsc.stop(); } catch (e) {}
    }
    this.binauralLayer = {};

    const leftOsc = this.audioContext.createOscillator();
    const rightOsc = this.audioContext.createOscillator();
    const leftGain = this.audioContext.createGain();
    const rightGain = this.audioContext.createGain();
    const leftPan = this.audioContext.createStereoPanner();
    const rightPan = this.audioContext.createStereoPanner();

    leftOsc.type = 'sine';
    rightOsc.type = 'sine';

    const base = Math.max(20, data.binauralBaseHz);
    const offset = Math.max(0.5, data.binauralBeatHz / 2);
    leftOsc.frequency.value = base - offset;
    rightOsc.frequency.value = base + offset;

    const mix = Math.max(0.02, data.binauralMix);
    leftGain.gain.value = mix;
    rightGain.gain.value = mix;

    leftPan.pan.value = -0.85;
    rightPan.pan.value = 0.85;

    leftOsc.connect(leftGain);
    rightOsc.connect(rightGain);
    leftGain.connect(leftPan);
    rightGain.connect(rightPan);
    leftPan.connect(this.masterGain);
    rightPan.connect(this.masterGain);

    try { leftOsc.start(); } catch (e) { console.error('Failed to start left binaural osc', e); }
    try { rightOsc.start(); } catch (e) { console.error('Failed to start right binaural osc', e); }

    this.binauralLayer = { leftOsc, rightOsc, leftGain, rightGain, leftPan, rightPan };
  }
  
  /**
   * Create texture layer (shimmer, rumble, wind)
   */
  private createTextureLayer(data: HeliosingerData): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return;
    
    // 1. Solar Wind Hiss (Velocity-driven)
    // Always create this as it's a core part of the "journey"
    this.textureLayer.windSource = this.audioContext.createBufferSource();
    this.textureLayer.windGain = this.audioContext.createGain();
    this.textureLayer.windFilter = this.audioContext.createBiquadFilter();
    
    this.textureLayer.windSource.buffer = this.noiseBuffer;
    this.textureLayer.windSource.loop = true;
    
    // Filter tracks velocity (set initial value)
    this.textureLayer.windFilter.type = 'bandpass';
    const velocity = data.velocity || 350;
    // Map 200-800 km/s to 200-1200 Hz center freq
    const windFreq = 200 + ((velocity - 200) / 600) * 1000;
    this.textureLayer.windFilter.frequency.value = windFreq;
    this.textureLayer.windFilter.Q.value = 0.8; // Wide band for "windy" sound
    
    // Gain tracks density (set initial value)
    const density = data.density || 5;
    // Map 0-20 p/cc to 0.0-0.15 gain
    const windVol = Math.min(0.15, (density / 20) * 0.15);
    this.textureLayer.windGain.gain.value = windVol;
    
    // Connect: wind -> filter -> gain -> master
    this.textureLayer.windSource.connect(this.textureLayer.windFilter);
    this.textureLayer.windFilter.connect(this.textureLayer.windGain);
    this.textureLayer.windGain.connect(this.masterGain);
    
    try {
      this.textureLayer.windSource.start();
    } catch (e) {
      console.error("Failed to start wind source", e);
    }

    // 2. High-frequency shimmer from temperature
    if (data.shimmerGain > 0) {
      this.textureLayer.noiseSource = this.audioContext.createBufferSource();
      this.textureLayer.noiseGain = this.audioContext.createGain();
      this.textureLayer.noiseFilter = this.audioContext.createBiquadFilter();
      
      this.textureLayer.noiseSource.buffer = this.noiseBuffer;
      this.textureLayer.noiseSource.loop = true;
      
      this.textureLayer.noiseFilter.type = 'bandpass';
      this.textureLayer.noiseFilter.frequency.value = 4000; // High frequency shimmer
      this.textureLayer.noiseFilter.Q.value = 2;
      
      this.textureLayer.noiseGain.gain.value = data.shimmerGain * 0.5; // Reduced for vocals
      
      // Connect: noise -> filter -> gain -> master
      this.textureLayer.noiseSource.connect(this.textureLayer.noiseFilter);
      this.textureLayer.noiseFilter.connect(this.textureLayer.noiseGain);
      this.textureLayer.noiseGain.connect(this.masterGain);
      
      try {
        this.textureLayer.noiseSource.start();
        console.log(`Started noise source for shimmer`);
      } catch (error) {
        console.error(`Failed to start noise source:`, error);
      }
    }
    
    // Low-frequency rumble for extreme conditions
    if (data.rumbleGain > 0) {
      this.textureLayer.rumbleOsc = this.audioContext.createOscillator();
      this.textureLayer.rumbleGain = this.audioContext.createGain();
      
      this.textureLayer.rumbleOsc.type = 'sine'; // Pure low tone
      this.textureLayer.rumbleOsc.frequency.value = 40; // Very low frequency
      
      this.textureLayer.rumbleGain.gain.value = data.rumbleGain;
      
      // Connect: rumble -> gain -> master
      this.textureLayer.rumbleOsc.connect(this.textureLayer.rumbleGain);
      this.textureLayer.rumbleGain.connect(this.masterGain);
      
      try {
        this.textureLayer.rumbleOsc.start();
        console.log(`Started rumble oscillator at ${this.textureLayer.rumbleOsc.frequency.value}Hz`);
      } catch (error) {
        console.error(`Failed to start rumble oscillator:`, error);
      }
    }
  }
  
  /**
   * Update the sun's singing as space weather changes
   */
  public updateSinging(heliosingerData: HeliosingerData): void {
    if (!this.isSinging || !this.audioContext || !this.heliosingerLayer) return;

    // Verify audio context is in a valid state
    if (this.audioContext.state !== 'running') {
      console.warn('AudioContext not running during update, state:', this.audioContext.state);
      return;
    }

    const now = this.audioContext.currentTime;
    const smoothingTime = 0.1; // 100ms smooth transitions

    // Update chord tone frequencies and formant filters
    heliosingerData.chordVoicing.forEach((chordTone, toneIndex) => {
      if (toneIndex >= this.heliosingerLayer!.chordToneLayers.length) return;

      const toneLayer = this.heliosingerLayer!.chordToneLayers[toneIndex];

      // Update chord tone frequency
      toneLayer.osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, chordTone.frequency),
        now + smoothingTime
      );

      // Update chord tone gain (use same multiplier as startSinging: 0.7)
      toneLayer.oscGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, chordTone.amplitude * 0.7),
        now + smoothingTime
      );
      
      // Update formant filters for this chord tone
      heliosingerData.formantFilters.forEach((formant, i) => {
        if (i >= toneLayer.formantFilters.length) return;
        
        const filter = toneLayer.formantFilters[i];
        const gain = toneLayer.formantGains[i];
        
        filter.frequency.exponentialRampToValueAtTime(
          Math.max(100, Math.min(20000, formant.frequency)),
          now + smoothingTime
        );
        
        filter.Q.exponentialRampToValueAtTime(
          Math.max(0.1, formant.frequency / formant.bandwidth),
          now + smoothingTime
        );
        
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.001, formant.gain),
          now + smoothingTime
        );
      });
      
      // Update stereo panning for this chord tone
      const panSpread = (heliosingerData.stereoSpread - 0.5) * 2;
      const tonePanOffset = (toneIndex - (heliosingerData.chordVoicing.length - 1) / 2) * 0.2;
      toneLayer.panner.pan.linearRampToValueAtTime(
        Math.max(-1, Math.min(1, panSpread * 0.7 + tonePanOffset)),
        now + smoothingTime
      );
    });
    
    // Update harmonic frequencies and gains
    heliosingerData.harmonicAmplitudes.forEach((amplitude, i) => {
      if (i === 0 || i >= this.heliosingerLayer!.harmonicOscs.length) return;
      
      const osc = this.heliosingerLayer!.harmonicOscs[i - 1];
      const gain = this.heliosingerLayer!.harmonicGains[i - 1];
      const harmonicNumber = i + 1;
      const targetFreq = heliosingerData.frequency * harmonicNumber;
      
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, targetFreq),
        now + smoothingTime
      );
      
      const targetGain = amplitude * 0.2;
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, targetGain),
        now + smoothingTime
      );
    });
    
    // Update master stereo panning
    const panSpread = (heliosingerData.stereoSpread - 0.5) * 2;
    this.heliosingerLayer.masterPanner.pan.linearRampToValueAtTime(
      Math.max(-1, Math.min(1, panSpread * 0.3)),
      now + smoothingTime
    );
    
    // Update reverb and delay
    // Note: exponentialRampToValueAtTime can't ramp to 0, so use minimum of 0.001
    if (this.delayNode && this.delayGain && this.delayFeedbackGain && this.reverbGain) {
      // delayTime uses linearRamp since it's not a gain value
      this.delayNode.delayTime.linearRampToValueAtTime(
        Math.max(0.05, Math.min(1.0, heliosingerData.delayTime)),
        now + smoothingTime
      );
      this.delayGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, Math.min(0.4, heliosingerData.delayGain)),
        now + smoothingTime
      );
      // Delay feedback can be 0, so use minimum of 0.001 for exponential ramp
      this.delayFeedbackGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, Math.min(0.5, heliosingerData.delayFeedback)),
        now + smoothingTime
      );
      this.reverbGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, Math.min(0.5, heliosingerData.reverbRoomSize * 0.3)),
        now + smoothingTime
      );
    }
    
    // Update modulation (vibrato, tremolo)
    if (this.modulationLayer.vibratoLfo && this.modulationLayer.vibratoGain) {
      this.modulationLayer.vibratoLfo.frequency.exponentialRampToValueAtTime(
        Math.max(0.1, heliosingerData.vibratoRate),
        now + smoothingTime
      );
      this.modulationLayer.vibratoGain.gain.exponentialRampToValueAtTime(
        Math.max(0.1, heliosingerData.vibratoDepth),
        now + smoothingTime
      );
    }
    
    if (this.modulationLayer.tremoloLfo && this.modulationLayer.tremoloGain) {
      this.modulationLayer.tremoloLfo.frequency.exponentialRampToValueAtTime(
        Math.max(0.1, heliosingerData.tremoloRate),
        now + smoothingTime
      );
      this.modulationLayer.tremoloGain.gain.exponentialRampToValueAtTime(
        Math.max(0.01, heliosingerData.tremoloDepth * 0.5),
        now + smoothingTime
      );
    }

    // Update binaural layer
    if (this.binauralLayer.leftOsc && this.binauralLayer.rightOsc && this.binauralLayer.leftGain && this.binauralLayer.rightGain) {
      const base = Math.max(20, heliosingerData.binauralBaseHz);
      const offset = Math.max(0.5, heliosingerData.binauralBeatHz / 2);
      const mix = Math.max(0.02, heliosingerData.binauralMix);
      this.binauralLayer.leftOsc.frequency.exponentialRampToValueAtTime(
        Math.max(20, base - offset),
        now + smoothingTime
      );
      this.binauralLayer.rightOsc.frequency.exponentialRampToValueAtTime(
        Math.max(20, base + offset),
        now + smoothingTime
      );
      this.binauralLayer.leftGain.gain.exponentialRampToValueAtTime(mix, now + smoothingTime);
      this.binauralLayer.rightGain.gain.exponentialRampToValueAtTime(mix, now + smoothingTime);
    }
    
    // Update texture layer
    if (this.textureLayer.windGain && this.textureLayer.windFilter) {
      const velocity = heliosingerData.velocity || 350;
      const density = heliosingerData.density || 5;
      
      // Update wind frequency (velocity)
      const targetWindFreq = 200 + ((velocity - 200) / 600) * 1000;
      this.textureLayer.windFilter.frequency.exponentialRampToValueAtTime(
        Math.max(100, targetWindFreq),
        now + smoothingTime
      );
      
      // Update wind volume (density)
      const targetWindVol = Math.min(0.15, (density / 20) * 0.15);
      this.textureLayer.windGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, targetWindVol),
        now + smoothingTime
      );
    }

    if (this.textureLayer.noiseGain && heliosingerData.shimmerGain > 0) {
      this.textureLayer.noiseGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, heliosingerData.shimmerGain * 0.5),
        now + smoothingTime
      );
    }
    
    if (this.textureLayer.rumbleGain && heliosingerData.rumbleGain > 0) {
      this.textureLayer.rumbleGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, heliosingerData.rumbleGain),
        now + smoothingTime
      );
    }
    
    // Don't override user volume - volume is controlled by setVolume()
    // The masterGain volume is set by setVolume() and should not be changed here
    
    // Log vowel changes
    if (this.currentData && this.currentData.vowelName !== heliosingerData.vowelName) {
      console.log(`🌞 Vowel change: "${this.currentData.vowelName}" → "${heliosingerData.vowelName}"`);
      console.log(`   ${heliosingerData.solarMood}`);
    }
    
    this.currentData = heliosingerData;
  }
  
  /**
   * Stop the sun from singing
   * Properly disconnects all audio nodes to prevent memory leaks
   */
  public stopSinging(): void {
    if (!this.isSinging) return;

    this.isSinging = false;

    // Stop Heliosinger layer with proper disconnect
    if (this.heliosingerLayer) {
      // Stop and disconnect all chord tone oscillators
      this.heliosingerLayer.chordToneLayers.forEach(toneLayer => {
        try {
          toneLayer.osc.stop();
          toneLayer.osc.disconnect();
          toneLayer.oscGain.disconnect();
          toneLayer.panner.disconnect();
          toneLayer.formantFilters.forEach(filter => filter.disconnect());
          toneLayer.formantGains.forEach(gain => gain.disconnect());
        } catch (e) { /* Node may already be disconnected */ }
      });
      // Stop and disconnect harmonic oscillators
      this.heliosingerLayer.harmonicOscs.forEach((osc, i) => {
        try {
          osc.stop();
          osc.disconnect();
          this.heliosingerLayer!.harmonicGains[i]?.disconnect();
        } catch (e) { /* Node may already be disconnected */ }
      });
      // Disconnect master panner
      try { this.heliosingerLayer.masterPanner.disconnect(); } catch (e) {}
      this.heliosingerLayer = null;
    }

    // Stop modulation layer with proper disconnect
    if (this.modulationLayer.vibratoLfo) {
      try {
        this.modulationLayer.vibratoLfo.stop();
        this.modulationLayer.vibratoLfo.disconnect();
        this.modulationLayer.vibratoGain?.disconnect();
      } catch (e) {}
    }
    if (this.modulationLayer.tremoloLfo) {
      try {
        this.modulationLayer.tremoloLfo.stop();
        this.modulationLayer.tremoloLfo.disconnect();
        this.modulationLayer.tremoloGain?.disconnect();
      } catch (e) {}
    }
    this.modulationLayer = {};

    // Stop texture layer with proper disconnect
    if (this.textureLayer.windSource) {
      try {
        this.textureLayer.windSource.stop();
        this.textureLayer.windSource.disconnect();
        this.textureLayer.windFilter?.disconnect();
        this.textureLayer.windGain?.disconnect();
      } catch (e) {}
    }
    if (this.textureLayer.noiseSource) {
      try {
        this.textureLayer.noiseSource.stop();
        this.textureLayer.noiseSource.disconnect();
        this.textureLayer.noiseFilter?.disconnect();
        this.textureLayer.noiseGain?.disconnect();
      } catch (e) {}
    }
    if (this.textureLayer.rumbleOsc) {
      try {
        this.textureLayer.rumbleOsc.stop();
        this.textureLayer.rumbleOsc.disconnect();
        this.textureLayer.rumbleGain?.disconnect();
      } catch (e) {}
    }
    this.textureLayer = {};

    // Stop binaural layer with proper disconnect
    if (this.binauralLayer.leftOsc) {
      try {
        this.binauralLayer.leftOsc.stop();
        this.binauralLayer.leftOsc.disconnect();
        this.binauralLayer.leftGain?.disconnect();
        this.binauralLayer.leftPan?.disconnect();
      } catch (e) {}
    }
    if (this.binauralLayer.rightOsc) {
      try {
        this.binauralLayer.rightOsc.stop();
        this.binauralLayer.rightOsc.disconnect();
        this.binauralLayer.rightGain?.disconnect();
        this.binauralLayer.rightPan?.disconnect();
      } catch (e) {}
    }
    this.binauralLayer = {};

    this.currentData = null;

    console.log('🌞 The sun has stopped singing');
  }
  
  /**
   * Set master volume
   */
  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.targetVolume = clampedVolume;
    
    // Apply volume immediately if audio is initialized
    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now); // Cancel any pending changes
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now); // Set current value
      this.masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, this.targetVolume),
        now + 0.1
      );
      console.log(`🔊 Volume set to ${(this.targetVolume * 100).toFixed(0)}%`);
    } else {
      // Volume will be applied when audio starts
      console.log(`🔊 Volume queued: ${(this.targetVolume * 100).toFixed(0)}% (audio not initialized)`);
    }
  }
  
  /**
   * Check if the sun is currently singing
   */
  public isSingingActive(): boolean {
    return this.isSinging;
  }
  
  /**
   * Get current singing data
   */
  public getCurrentData(): HeliosingerData | null {
    return this.currentData;
  }
  
  /**
   * Cleanup and dispose
   */
  public dispose(): void {
    this.stopSinging();
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.masterGain = null;
    this.compressor = null;
    this.limiter = null;
  }
}

// Global instance
const heliosingerEngine = new HeliosingerEngine();

// Export functions
export const startSinging = (heliosingerData: HeliosingerData): Promise<void> => {
  return heliosingerEngine.startSinging(heliosingerData);
};

export const updateSinging = (heliosingerData: HeliosingerData): void => {
  heliosingerEngine.updateSinging(heliosingerData);
};

export const stopSinging = (): void => {
  heliosingerEngine.stopSinging();
};

export const setSingingVolume = (volume: number): void => {
  heliosingerEngine.setVolume(volume);
};

export const isSingingActive = (): boolean => {
  return heliosingerEngine.isSingingActive();
};

export const getCurrentSingingData = (): HeliosingerData | null => {
  return heliosingerEngine.getCurrentData();
};

export const disposeHeliosinger = (): void => {
  heliosingerEngine.dispose();
};

export const ensureAudioUnlocked = (): Promise<void> => {
  return heliosingerEngine.ensureUnlocked();
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    heliosingerEngine.dispose();
  });
}

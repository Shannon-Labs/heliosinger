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
  
  // Sub-bass rumble (for extreme conditions)
  rumbleOsc?: OscillatorNode;
  rumbleGain?: GainNode;
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
  
  // State
  private isSinging: boolean = false;
  private currentData: HeliosingerData | null = null;
  private targetVolume: number = 0.3;
  
  // Noise buffer for texture
  private noiseBuffer: AudioBuffer | null = null;
  
  private async initializeAudio(): Promise<void> {
    try {
      if (!this.audioContext) {
        // Check if AudioContext is supported
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
          throw new Error('Web Audio API is not supported in this browser');
        }

        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
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
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (resumeError) {
          console.warn('Failed to resume audio context:', resumeError);
          throw new Error('Audio requires user interaction. Please click to enable audio.');
        }
      }

      // Check if audio context is in a valid state
      if (this.audioContext.state === 'closed') {
        throw new Error('Audio context has been closed');
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
    
    // Ensure volume is set before starting (important for mobile)
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0.001, this.targetVolume);
    }
    
    // Configure reverb and delay
    this.configureReverbDelay(heliosingerData);
    
    // Create the main Heliosinger layer (the sun's voice with chord voicing)
    this.heliosingerLayer = this.createHeliosingerLayer(heliosingerData);
    
    // Create modulation layer (vibrato, tremolo)
    this.createModulationLayer(heliosingerData);
    
    // Create texture layer (shimmer, rumble)
    if (heliosingerData.shimmerGain > 0 || heliosingerData.rumbleGain > 0) {
      this.createTextureLayer(heliosingerData);
    }
    
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
      toneLayer.oscGain.gain.value = chordTone.amplitude * 0.4;
      
      // Create formant filters for this chord tone (apply vowel shape to each note)
      data.formantFilters.forEach((formant, i) => {
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = formant.frequency;
        filter.Q.value = formant.frequency / formant.bandwidth;
        
        const gain = this.audioContext!.createGain();
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
      
      // Start oscillator
      toneLayer.osc.start();
      
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
    layer.harmonicOscs.forEach(osc => osc.start());
    
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
      
      this.modulationLayer.vibratoLfo.start();
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
      
      this.modulationLayer.tremoloLfo.start();
    }
  }
  
  /**
   * Create texture layer (shimmer, rumble)
   */
  private createTextureLayer(data: HeliosingerData): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return;
    
    // High-frequency shimmer from temperature
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
      
      this.textureLayer.noiseSource.start();
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
      
      this.textureLayer.rumbleOsc.start();
    }
  }
  
  /**
   * Update the sun's singing as space weather changes
   */
  public updateSinging(heliosingerData: HeliosingerData): void {
    if (!this.isSinging || !this.audioContext || !this.heliosingerLayer) return;
    
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
      
      // Update chord tone gain
      toneLayer.oscGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, chordTone.amplitude * 0.4),
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
    if (this.delayNode && this.delayGain && this.delayFeedbackGain && this.reverbGain) {
      this.delayNode.delayTime.exponentialRampToValueAtTime(
        Math.max(0.1, Math.min(1.0, heliosingerData.delayTime)),
        now + smoothingTime
      );
      this.delayGain.gain.exponentialRampToValueAtTime(
        Math.max(0.1, Math.min(0.4, heliosingerData.delayGain)),
        now + smoothingTime
      );
      this.delayFeedbackGain.gain.exponentialRampToValueAtTime(
        Math.max(0, Math.min(0.5, heliosingerData.delayFeedback)),
        now + smoothingTime
      );
      this.reverbGain.gain.exponentialRampToValueAtTime(
        Math.max(0.05, Math.min(0.5, heliosingerData.reverbRoomSize * 0.3)),
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
    
    // Update texture layer
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
   */
  public stopSinging(): void {
    if (!this.isSinging) return;
    
    this.isSinging = false;
    
    // Stop Heliosinger layer
    if (this.heliosingerLayer) {
      // Stop all chord tone oscillators
      this.heliosingerLayer.chordToneLayers.forEach(toneLayer => {
        try { toneLayer.osc.stop(); } catch (e) {}
      });
      // Stop harmonic oscillators
      this.heliosingerLayer.harmonicOscs.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      this.heliosingerLayer = null;
    }
    
    // Stop modulation layer
    if (this.modulationLayer.vibratoLfo) {
      try { this.modulationLayer.vibratoLfo.stop(); } catch (e) {}
    }
    if (this.modulationLayer.tremoloLfo) {
      try { this.modulationLayer.tremoloLfo.stop(); } catch (e) {}
    }
    this.modulationLayer = {};
    
    // Stop texture layer
    if (this.textureLayer.noiseSource) {
      try { this.textureLayer.noiseSource.stop(); } catch (e) {}
    }
    if (this.textureLayer.rumbleOsc) {
      try { this.textureLayer.rumbleOsc.stop(); } catch (e) {}
    }
    this.textureLayer = {};
    
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

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    heliosingerEngine.dispose();
  });
}

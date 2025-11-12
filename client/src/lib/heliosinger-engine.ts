/**
 * Heliosinger Audio Engine
 * 
 * Makes the sun literally sing space weather using vowel formant filters
 * and harmonic synthesis. The sun's "voice" changes based on solar wind
 * conditions, creating a poetic and scientifically accurate sonification.
 */

import type { HeliosingerData } from "./heliosinger-mapping";

interface HeliosingerLayer {
  // Fundamental oscillator (the sun's "voice box")
  fundamentalOsc: OscillatorNode;
  fundamentalGain: GainNode;
  
  // Formant filters (create vowel sounds)
  formantFilters: BiquadFilterNode[];
  formantGains: GainNode[];
  
  // Harmonic oscillators (add richness to the voice)
  harmonicOscs: OscillatorNode[];
  harmonicGains: GainNode[];
  
  // Stereo panning
  panner: StereoPannerNode;
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
    if (!this.audioContext) {
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
      
      // Connect chain: masterGain -> compressor -> limiter -> destination
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.limiter);
      this.limiter.connect(this.audioContext.destination);
      
      // Set master volume
      this.masterGain.gain.value = this.targetVolume;
      
      // Create noise buffer for texture layer
      this.createNoiseBuffer();
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
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
    
    // Create the main Heliosinger layer (the sun's voice)
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
  }
  
  /**
   * Create the main Heliosinger layer - the sun's singing voice
   */
  private createHeliosingerLayer(data: HeliosingerData): HeliosingerLayer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }
    
    const layer: HeliosingerLayer = {
      fundamentalOsc: this.audioContext.createOscillator(),
      fundamentalGain: this.audioContext.createGain(),
      formantFilters: [],
      formantGains: [],
      harmonicOscs: [],
      harmonicGains: [],
      panner: this.audioContext.createStereoPanner()
    };
    
    // Configure fundamental oscillator (the sun's vocal cords)
    layer.fundamentalOsc.type = 'sawtooth'; // Rich in harmonics, like a voice
    layer.fundamentalOsc.frequency.value = data.frequency;
    
    // Fundamental gain (overall volume before formants)
    layer.fundamentalGain.gain.value = 0.4;
    
    // Create formant filters (the sun's vocal tract shaping the vowel)
    data.formantFilters.forEach((formant, i) => {
      const filter = this.audioContext!.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = formant.frequency;
      filter.Q.value = formant.frequency / formant.bandwidth; // Convert bandwidth to Q
      
      const gain = this.audioContext!.createGain();
      gain.gain.value = formant.gain;
      
      layer.formantFilters.push(filter);
      layer.formantGains.push(gain);
      
      // Connect: filter -> gain (will connect to fundamental later)
      filter.connect(gain);
    });
    
    // Create harmonic oscillators (adds richness to the voice)
    data.harmonicAmplitudes.forEach((amplitude, i) => {
      if (i === 0) return; // Skip fundamental, we already have it
      
      const harmonicNumber = i + 1;
      const harmonicFreq = data.frequency * harmonicNumber;
      
      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine'; // Pure harmonics
      osc.frequency.value = harmonicFreq;
      
      const gain = this.audioContext!.createGain();
      gain.gain.value = amplitude * 0.2; // Scale down harmonics
      
      layer.harmonicOscs.push(osc);
      layer.harmonicGains.push(gain);
      
      // Connect: osc -> gain -> panner -> master
      osc.connect(gain);
      gain.connect(layer.panner);
    });
    
    // Configure stereo panning
    const panSpread = (data.stereoSpread - 0.5) * 2;
    layer.panner.pan.value = panSpread * 0.7; // Slightly reduced for vocals
    
    // Connect the formant filter bank
    // Fundamental -> [Formant Filters in parallel] -> Panner -> Master
    layer.formantFilters.forEach((filter, i) => {
      layer.fundamentalOsc.connect(filter);
      layer.formantGains[i].connect(layer.panner);
    });
    
    // Connect harmonics to panner
    // (Already connected above)
    
    // Connect panner to master
    layer.panner.connect(this.masterGain);
    
    // Start oscillators
    layer.fundamentalOsc.start();
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
      
      // Connect vibrato to fundamental frequency
      this.modulationLayer.vibratoLfo.connect(this.modulationLayer.vibratoGain);
      this.modulationLayer.vibratoGain.connect(this.heliosingerLayer.fundamentalOsc.frequency);
      
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
      this.heliosingerLayer.formantGains.forEach(gain => {
        this.modulationLayer.tremoloGain!.connect(gain.gain);
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
    
    // Update fundamental frequency (pitch)
    this.heliosingerLayer.fundamentalOsc.frequency.exponentialRampToValueAtTime(
      Math.max(20, heliosingerData.frequency),
      now + smoothingTime
    );
    
    // Update formant filters (vowel shaping)
    heliosingerData.formantFilters.forEach((formant, i) => {
      if (i >= this.heliosingerLayer!.formantFilters.length) return;
      
      const filter = this.heliosingerLayer!.formantFilters[i];
      const gain = this.heliosingerLayer!.formantGains[i];
      
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
    
    // Update stereo panning
    const panSpread = (heliosingerData.stereoSpread - 0.5) * 2;
    this.heliosingerLayer.panner.pan.linearRampToValueAtTime(
      Math.max(-1, Math.min(1, panSpread * 0.7)),
      now + smoothingTime
    );
    
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
    
    // Update master volume based on condition
    const targetVolume = heliosingerData.condition === 'extreme' ? 0.5 : 
                        heliosingerData.condition === 'storm' ? 0.4 : 0.3;
    
    if (this.masterGain) {
      this.masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, targetVolume),
        now + smoothingTime
      );
    }
    
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
      try { this.heliosingerLayer.fundamentalOsc.stop(); } catch (e) {}
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
    this.targetVolume = Math.max(0, Math.min(1, volume));
    
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, this.targetVolume),
        this.audioContext.currentTime + 0.1
      );
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

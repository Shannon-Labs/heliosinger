import type { EnhancedChordData } from "./audio-mapping";
import { midiNoteToFrequency } from "./midi-mapping";

// ============================================================================
// ENHANCED AUDIO ENGINE
// Implements multi-layer sonification architecture
// ============================================================================

interface AudioLayer {
  oscillators: OscillatorNode[];
  gainNodes: GainNode[];
  filterNodes: BiquadFilterNode[];
  pannerNodes?: StereoPannerNode[];
}

interface ModulationLayer {
  vibratoLfo?: OscillatorNode;
  vibratoGain?: GainNode;
  tremoloLfo?: OscillatorNode;
  tremoloGain?: GainNode;
}

interface TextureLayer {
  noiseSource?: AudioBufferSourceNode;
  noiseGain?: GainNode;
  noiseFilter?: BiquadFilterNode;
  rumbleOsc?: OscillatorNode;
  rumbleGain?: GainNode;
}

class EnhancedAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  
  // Audio layers
  private foundationLayer: AudioLayer | null = null;
  private spatialLayer: ModulationLayer = {};
  private rhythmicLayer: ModulationLayer = {};
  private textureLayer: TextureLayer = {};
  
  // Ambient mode
  private ambientMode: boolean = false;
  private ambientLayers: AudioLayer[] = [];
  private ambientVolume: number = 0.3;
  private smoothingConstant: number = 0.8;
  
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
      this.masterGain.gain.value = this.ambientVolume;
      
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
  
  public async startAmbient(enhancedData: EnhancedChordData): Promise<void> {
    await this.initializeAudio();
    
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }
    
    // Stop existing ambient if running
    if (this.ambientMode) {
      this.stopAmbient();
    }
    
    this.ambientMode = true;
    
    // Create foundation layer (harmonic oscillators)
    this.foundationLayer = this.createFoundationLayer(enhancedData);
    
    // Create spatial modulation layer (vibrato, stereo)
    this.createSpatialLayer(enhancedData);
    
    // Create rhythmic modulation layer (tremolo from K-index)
    this.createRhythmicLayer(enhancedData);
    
    // Create texture layer (noise, rumble)
    if (enhancedData.shimmerGain > 0 || enhancedData.rumbleGain > 0) {
      this.createTextureLayer(enhancedData);
    }
    
    console.log(`Started enhanced ambient mode: ${enhancedData.baseNote} with ${enhancedData.harmonicCount} harmonics`);
  }
  
  private createFoundationLayer(data: EnhancedChordData): AudioLayer {
    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }
    
    const layer: AudioLayer = {
      oscillators: [],
      gainNodes: [],
      filterNodes: [],
      pannerNodes: []
    };
    
    // Create one oscillator per harmonic
    for (let i = 0; i < data.harmonicCount; i++) {
      const harmonicNumber = i + 1;
      const frequency = data.frequency * harmonicNumber;
      const amplitude = data.harmonicAmplitudes[i] || (1 / harmonicNumber);
      
      // Create oscillator
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = i === 0 ? 'sine' : 'triangle'; // Fundamental sine, others triangle
      oscillator.frequency.value = frequency;
      
      // Create filter
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = data.filterFrequency * harmonicNumber;
      filter.Q.value = data.filterQ;
      
      // Create gain
      const gain = this.audioContext.createGain();
      gain.gain.value = amplitude * 0.3; // Scale down to prevent clipping
      
      // Create stereo panner
      const panner = this.audioContext.createStereoPanner();
      
      // Calculate pan position based on harmonic number and Bz
      const panSpread = (data.stereoSpread - 0.5) * 2; // Convert to -1 to 1
      const harmonicPan = panSpread * (harmonicNumber / data.harmonicCount);
      panner.pan.value = Math.max(-1, Math.min(1, harmonicPan));
      
      // Connect chain: osc -> filter -> gain -> panner -> master
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(panner);
      panner.connect(this.masterGain);
      
      // Start oscillator
      oscillator.start();
      
      layer.oscillators.push(oscillator);
      layer.gainNodes.push(gain);
      layer.filterNodes.push(filter);
      layer.pannerNodes!.push(panner);
    }
    
    return layer;
  }
  
  private createSpatialLayer(data: EnhancedChordData): void {
    if (!this.audioContext || !this.foundationLayer) return;
    
    // Create vibrato LFO for Bz effects
    if (data.vibratoDepth > 0) {
      this.spatialLayer.vibratoLfo = this.audioContext.createOscillator();
      this.spatialLayer.vibratoGain = this.audioContext.createGain();
      
      this.spatialLayer.vibratoLfo.type = 'sine';
      this.spatialLayer.vibratoLfo.frequency.value = data.vibratoRate;
      this.spatialLayer.vibratoGain.gain.value = data.vibratoDepth;
      
      // Connect vibrato to all oscillator frequencies
      this.foundationLayer.oscillators.forEach(osc => {
        this.spatialLayer.vibratoLfo!.connect(this.spatialLayer.vibratoGain!);
        this.spatialLayer.vibratoGain!.connect(osc.frequency);
      });
      
      this.spatialLayer.vibratoLfo.start();
    }
    
    // Apply stereo gains
    if (this.foundationLayer.pannerNodes) {
      this.foundationLayer.pannerNodes.forEach((panner, i) => {
        // Base pan is already set, now add slight movement from By
        // This would require continuous updates in updateAmbient
      });
    }
  }
  
  private createRhythmicLayer(data: EnhancedChordData): void {
    if (!this.audioContext || !this.foundationLayer) return;
    
    // Create tremolo LFO from K-index
    if (data.tremoloDepth > 0.05) { // Only if significant
      this.rhythmicLayer.tremoloLfo = this.audioContext.createOscillator();
      this.rhythmicLayer.tremoloGain = this.audioContext.createGain();
      
      this.rhythmicLayer.tremoloLfo.type = data.tremoloRate > 4 ? 'square' : 'sine';
      this.rhythmicLayer.tremoloLfo.frequency.value = data.tremoloRate;
      this.rhythmicLayer.tremoloGain.gain.value = data.tremoloDepth;
      
      // Connect tremolo to all oscillator gains
      this.foundationLayer.gainNodes.forEach(gain => {
        this.rhythmicLayer.tremoloLfo!.connect(this.rhythmicLayer.tremoloGain!);
        this.rhythmicLayer.tremoloGain!.connect(gain.gain);
      });
      
      this.rhythmicLayer.tremoloLfo.start();
    }
  }
  
  private createTextureLayer(data: EnhancedChordData): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return;
    
    // High-frequency shimmer from temperature
    if (data.shimmerGain > 0) {
      this.textureLayer.noiseSource = this.audioContext.createBufferSource();
      this.textureLayer.noiseGain = this.audioContext.createGain();
      this.textureLayer.noiseFilter = this.audioContext.createBiquadFilter();
      
      this.textureLayer.noiseSource.buffer = this.noiseBuffer;
      this.textureLayer.noiseSource.loop = true;
      
      this.textureLayer.noiseFilter.type = 'bandpass';
      this.textureLayer.noiseFilter.frequency.value = 3000; // 3kHz shimmer
      this.textureLayer.noiseFilter.Q.value = 2;
      
      this.textureLayer.noiseGain.gain.value = data.shimmerGain;
      
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
      
      this.textureLayer.rumbleOsc.type = 'sawtooth';
      this.textureLayer.rumbleOsc.frequency.value = 60; // 60 Hz rumble
      
      this.textureLayer.rumbleGain.gain.value = data.rumbleGain;
      
      // Connect: rumble -> gain -> master
      this.textureLayer.rumbleOsc.connect(this.textureLayer.rumbleGain);
      this.textureLayer.rumbleGain.connect(this.masterGain);
      
      this.textureLayer.rumbleOsc.start();
    }
  }
  
  public updateAmbient(data: EnhancedChordData): void {
    if (!this.ambientMode || !this.audioContext || !this.foundationLayer) return;
    
    const now = this.audioContext.currentTime;
    const smoothingTime = 0.1; // 100ms transitions
    
    // Update foundation layer frequencies and gains
    data.harmonicAmplitudes.forEach((amplitude, i) => {
      if (i >= this.foundationLayer!.oscillators.length) return;
      
      const oscillator = this.foundationLayer!.oscillators[i];
      const gain = this.foundationLayer!.gainNodes[i];
      const filter = this.foundationLayer!.filterNodes[i];
      const panner = this.foundationLayer!.pannerNodes![i];
      
      const harmonicNumber = i + 1;
      const targetFrequency = data.frequency * harmonicNumber;
      
      // Smooth frequency changes
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, targetFrequency),
        now + smoothingTime
      );
      
      // Update gain with amplitude scaling
      const targetGain = amplitude * 0.3;
      gain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, targetGain),
        now + smoothingTime
      );
      
      // Update filter
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(100, Math.min(20000, data.filterFrequency * harmonicNumber)),
        now + smoothingTime
      );
      filter.Q.exponentialRampToValueAtTime(
        Math.max(0.1, data.filterQ),
        now + smoothingTime
      );
      
      // Update panner based on stereo spread
      const panSpread = (data.stereoSpread - 0.5) * 2;
      const harmonicPan = panSpread * (harmonicNumber / data.harmonicCount);
      panner.pan.linearRampToValueAtTime(
        Math.max(-1, Math.min(1, harmonicPan)),
        now + smoothingTime
      );
    });
    
    // Update spatial layer (vibrato)
    if (this.spatialLayer.vibratoLfo && this.spatialLayer.vibratoGain) {
      this.spatialLayer.vibratoLfo.frequency.exponentialRampToValueAtTime(
        Math.max(0.1, data.vibratoRate),
        now + smoothingTime
      );
      this.spatialLayer.vibratoGain.gain.exponentialRampToValueAtTime(
        Math.max(0.1, data.vibratoDepth),
        now + smoothingTime
      );
    }
    
    // Update rhythmic layer (tremolo)
    if (this.rhythmicLayer.tremoloLfo && this.rhythmicLayer.tremoloGain) {
      this.rhythmicLayer.tremoloLfo.frequency.exponentialRampToValueAtTime(
        Math.max(0.1, data.tremoloRate),
        now + smoothingTime
      );
      this.rhythmicLayer.tremoloGain.gain.exponentialRampToValueAtTime(
        Math.max(0.01, data.tremoloDepth),
        now + smoothingTime
      );
    }
    
    // Update texture layer
    if (this.textureLayer.noiseGain && data.shimmerGain > 0) {
      this.textureLayer.noiseGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, data.shimmerGain),
        now + smoothingTime
      );
    }
    
    if (this.textureLayer.rumbleGain && data.rumbleGain > 0) {
      this.textureLayer.rumbleGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, data.rumbleGain),
        now + smoothingTime
      );
    }
    
    // Update master volume based on condition
    const targetVolume = data.condition === 'extreme' ? 0.5 : 
                        data.condition === 'storm' ? 0.4 : 0.3;
    
    if (this.masterGain) {
      this.masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, targetVolume),
        now + smoothingTime
      );
    }
  }
  
  public stopAmbient(): void {
    if (!this.ambientMode) return;
    
    this.ambientMode = false;
    
    // Stop foundation layer
    if (this.foundationLayer) {
      this.foundationLayer.oscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
      this.foundationLayer = null;
    }
    
    // Stop spatial layer
    if (this.spatialLayer.vibratoLfo) {
      try { this.spatialLayer.vibratoLfo.stop(); } catch (e) {}
    }
    this.spatialLayer = {};
    
    // Stop rhythmic layer
    if (this.rhythmicLayer.tremoloLfo) {
      try { this.rhythmicLayer.tremoloLfo.stop(); } catch (e) {}
    }
    this.rhythmicLayer = {};
    
    // Stop texture layer
    if (this.textureLayer.noiseSource) {
      try { this.textureLayer.noiseSource.stop(); } catch (e) {}
    }
    if (this.textureLayer.rumbleOsc) {
      try { this.textureLayer.rumbleOsc.stop(); } catch (e) {}
    }
    this.textureLayer = {};
  }
  
  public setAmbientVolume(volume: number): void {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    
    if (this.masterGain && this.audioContext) {
      this.masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, this.ambientVolume),
        this.audioContext.currentTime + 0.1
      );
    }
  }
  
  public isAmbientActive(): boolean {
    return this.ambientMode;
  }
  
  public dispose(): void {
    this.stopAmbient();
    
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
const enhancedAudioEngine = new EnhancedAudioEngine();

// Export functions
export const startEnhancedAmbient = (enhancedData: EnhancedChordData): Promise<void> => {
  return enhancedAudioEngine.startAmbient(enhancedData);
};

export const updateEnhancedAmbient = (enhancedData: EnhancedChordData): void => {
  enhancedAudioEngine.updateAmbient(enhancedData);
};

export const stopEnhancedAmbient = (): void => {
  enhancedAudioEngine.stopAmbient();
};

export const setEnhancedAmbientVolume = (volume: number): void => {
  enhancedAudioEngine.setAmbientVolume(volume);
};

export const isEnhancedAmbientActive = (): boolean => {
  return enhancedAudioEngine.isAmbientActive();
};

export const disposeEnhancedAudio = (): void => {
  enhancedAudioEngine.dispose();
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    enhancedAudioEngine.dispose();
  });
}

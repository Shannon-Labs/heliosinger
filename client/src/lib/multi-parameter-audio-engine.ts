import type { ChordData, ComprehensiveSpaceWeatherData } from "@shared/schema";
import { midiNoteToFrequency, centsToFrequencyRatio } from "./midi-mapping.js";

interface AudioLayer {
  name: string;
  enabled: boolean;
  volume: number;
  nodes: AudioNode[];
  cleanup: () => void;
}

interface FlareEvent {
  timestamp: number;
  intensity: number;
  class: string;
}

class MultiParameterAudioEngine {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private layers: Map<string, AudioLayer> = new Map();
  
  // Layer-specific properties
  private baseLayerOscillators: OscillatorNode[] = [];
  private flareLayerGain: GainNode | null = null;
  private protonHarmonics: OscillatorNode[] = [];
  private electronHighFreq: OscillatorNode[] = [];
  private kIndexLFO: OscillatorNode | null = null;
  private kIndexGain: GainNode | null = null;
  private kIndexPulseOsc: OscillatorNode | null = null;
  private kIndexModulatedGain: GainNode | null = null;
  private magnetometerRumble: OscillatorNode | null = null;
  private magnetometerGain: GainNode | null = null;
  
  // State
  private isActive: boolean = false;
  private lastFlareTime: number = 0;
  private currentData: ComprehensiveSpaceWeatherData | null = null;

  private async initializeAudio(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.3;
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Map K-index to tempo/pulse rate (0-9 → 0.5-8 Hz)
  private kIndexToPulseRate(kp: number): number {
    if (kp <= 2) return 0.5; // Slow, gentle
    if (kp <= 4) return 2.0; // Moderate
    if (kp <= 6) return 4.0; // Fast, urgent
    return 8.0; // Very fast, intense (K7-K9)
  }

  // Map X-ray flux to brightness/volume multiplier
  private xrayToBrightness(xrayFlux: number | undefined): number {
    if (!xrayFlux) return 1.0;
    // Normalize to 0-1 range, then scale to 1.0-2.5x brightness
    const normalized = Math.min(1.0, Math.max(0, (xrayFlux - 1e-8) / 1e-5));
    return 1.0 + (normalized * 1.5);
  }

  // Map proton flux to harmonic count (0-5 additional harmonics)
  private protonToHarmonicCount(protonFlux: number | undefined): number {
    if (!protonFlux || protonFlux < 1) return 0;
    // Log scale: 1-10 → 1 harmonic, 10-100 → 2, 100-1000 → 3, etc.
    const logFlux = Math.log10(protonFlux);
    return Math.min(5, Math.max(0, Math.floor(logFlux)));
  }

  // Map electron flux to high-frequency content (0-3 high-freq oscillators)
  private electronToHighFreqCount(electronFlux: number | undefined): number {
    if (!electronFlux || electronFlux < 1) return 0;
    const logFlux = Math.log10(electronFlux);
    return Math.min(3, Math.max(0, Math.floor(logFlux / 2)));
  }

  // Map magnetometer to rumble intensity (0-1)
  private magnetometerToRumble(hComponent: number | undefined): number {
    if (!hComponent) return 0;
    // Use variation from baseline (assume ~20000 nT baseline)
    const variation = Math.abs(hComponent - 20000);
    return Math.min(1.0, variation / 1000); // Normalize to 0-1
  }

  public async startMultiParameter(data: ComprehensiveSpaceWeatherData, masterVolume: number = 0.3): Promise<void> {
    await this.initializeAudio();
    if (!this.audioContext || !this.masterGain) return;

    this.stopMultiParameter();
    this.isActive = true;
    this.currentData = data;

    this.masterGain.gain.value = masterVolume;

    // Layer 1: Base Solar Wind Layer (enhanced with all parameters)
    if (data.solar_wind) {
      this.createBaseLayer({
        ...data.solar_wind,
        bt: data.solar_wind.bt,
        bx: data.solar_wind.bx,
        by: data.solar_wind.by
      });
    }

    // Layer 2: K-index Rhythm Layer
    if (data.k_index) {
      this.createKIndexLayer(data.k_index.kp);
    }

    // Layer 3: X-ray Flare Layer (event-based)
    if (data.xray_flux) {
      this.createXrayFlareLayer(data.xray_flux);
    }

    // Layer 4: Proton Flux Harmonic Layer
    if (data.proton_flux) {
      this.createProtonHarmonicLayer(data.proton_flux.flux_10mev);
    }

    // Layer 5: Electron Flux High-Frequency Layer
    if (data.electron_flux) {
      this.createElectronHighFreqLayer(data.electron_flux.flux_2mev);
    }

    // Layer 6: Magnetometer Rumble Layer
    if (data.magnetometer) {
      this.createMagnetometerRumbleLayer(data.magnetometer.h_component);
    }
  }

  private createBaseLayer(solarWind: { velocity: number; density: number; bz: number; temperature: number; bt?: number; bx?: number; by?: number }): void {
    if (!this.audioContext || !this.masterGain) return;

    // Calculate base frequency from velocity (200-800 km/s → C2-C6)
    const velocityRange = 800 - 200;
    const midiRange = 84 - 36;
    const velocityNormalized = Math.max(0, Math.min(1, (solarWind.velocity - 200) / velocityRange));
    const midiNote = Math.round(36 + (velocityNormalized * midiRange));
    const baseFreq = midiNoteToFrequency(midiNote);

    // Create fundamental + more harmonics (increased from 3 to 5)
    const harmonicRatios = [1.0, 2.0, 3.0, 4.0, 5.0];
    harmonicRatios.forEach((ratio, index) => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();

      osc.type = index === 0 ? 'sine' : index < 3 ? 'triangle' : 'sawtooth';
      osc.frequency.value = baseFreq * ratio;
      
      // Increase volume - make it more audible
      const harmonicGain = index === 0 ? 1.0 : (0.4 / index);
      gain.gain.value = harmonicGain * 0.7; // Increased from 0.5

      filter.type = 'lowpass';
      // Temperature affects filter resonance (hotter = brighter)
      const tempNormalized = Math.min(1, Math.max(0, (solarWind.temperature - 10000) / 200000));
      const filterFreq = baseFreq * ratio * (2 + solarWind.density * 0.1 + tempNormalized * 2);
      filter.frequency.value = filterFreq;
      filter.Q.value = 1 + tempNormalized * 2; // Higher Q for hotter temperatures

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);

      osc.start();
      this.baseLayerOscillators.push(osc);
    });

    // Add vibrato based on Bz (more prominent)
    if (Math.abs(solarWind.bz) > 3 && this.baseLayerOscillators.length > 0) {
      const vibratoOsc = this.audioContext.createOscillator();
      const vibratoGain = this.audioContext.createGain();
      
      vibratoOsc.type = 'sine';
      vibratoOsc.frequency.value = 2 + Math.abs(solarWind.bz) * 0.1; // Faster vibrato for stronger Bz
      vibratoGain.gain.value = Math.abs(solarWind.bz) * 0.8; // Increased from 0.5
      
      vibratoOsc.connect(vibratoGain);
      vibratoGain.connect(this.baseLayerOscillators[0].frequency);
      vibratoOsc.start();
    }

    // Add temperature-based layer (high-frequency shimmer for high temperatures)
    if (solarWind.temperature > 50000) {
      const tempOsc = this.audioContext.createOscillator();
      const tempGain = this.audioContext.createGain();
      const tempFilter = this.audioContext.createBiquadFilter();
      
      const tempNormalized = Math.min(1, (solarWind.temperature - 50000) / 150000);
      tempOsc.type = 'sine';
      tempOsc.frequency.value = 2000 + (tempNormalized * 3000); // 2-5 kHz
      
      tempFilter.type = 'highpass';
      tempFilter.frequency.value = tempOsc.frequency.value * 0.8;
      
      tempGain.gain.value = tempNormalized * 0.3;
      
      tempOsc.connect(tempFilter);
      tempFilter.connect(tempGain);
      tempGain.connect(this.masterGain!);
      
      tempOsc.start();
      this.baseLayerOscillators.push(tempOsc);
    }

    // Add Bt (total magnetic field) layer - affects overall brightness
    if (solarWind.bt && solarWind.bt > 0) {
      const btGain = this.audioContext.createGain();
      const btNormalized = Math.min(1, solarWind.bt / 20); // Normalize 0-20 nT
      btGain.gain.value = 1.0 + (btNormalized * 0.5); // Increase overall volume by up to 50%
      
      // Apply to all base oscillators
      this.baseLayerOscillators.forEach(osc => {
        // We'll apply this in the update method
      });
    }
  }

  private createKIndexLayer(kp: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const pulseRate = this.kIndexToPulseRate(kp);
    
    // Create LFO for rhythmic modulation - make it more prominent
    this.kIndexLFO = this.audioContext.createOscillator();
    this.kIndexGain = this.audioContext.createGain();
    this.kIndexModulatedGain = this.audioContext.createGain();
    
    this.kIndexLFO.type = 'sine';
    this.kIndexLFO.frequency.value = pulseRate;
    
    // Create a more audible pulse oscillator
    this.kIndexPulseOsc = this.audioContext.createOscillator();
    this.kIndexPulseOsc.type = kp > 5 ? 'square' : 'sine'; // Harsher for high K-index
    this.kIndexPulseOsc.frequency.value = 80 + (kp * 10); // 80-170 Hz based on K-index
    
    // Set up modulation - make it more prominent
    this.kIndexGain.gain.value = 0.15; // Increased modulation depth
    
    // Create a gain node for the pulse oscillator - make it louder
    const pulseGain = this.audioContext.createGain();
    const baseVolume = 0.15 + (kp / 9 * 0.15); // 0.15-0.3 based on K-index
    pulseGain.gain.value = baseVolume;
    
    // Connect pulse oscillator
    this.kIndexPulseOsc.connect(pulseGain);
    pulseGain.connect(this.kIndexModulatedGain);
    this.kIndexModulatedGain.connect(this.masterGain);
    
    // Use scheduled updates to modulate the pulse gain based on LFO
    // This creates a rhythmic pulsing effect - make it more dramatic
    const scheduleModulation = () => {
      if (!this.isActive || !this.audioContext) return;
      
      const now = this.audioContext.currentTime;
      const lfoValue = Math.sin(now * pulseRate * 2 * Math.PI);
      const modulationDepth = 0.1 + (kp / 9 * 0.1); // 0.1-0.2 based on K-index
      const modulatedValue = baseVolume + (lfoValue * modulationDepth);
      
      pulseGain.gain.setValueAtTime(Math.max(0.05, modulatedValue), now);
      
      // Schedule next update
      setTimeout(() => scheduleModulation(), 50); // Update every 50ms
    };
    
    this.kIndexLFO.start();
    this.kIndexPulseOsc.start();
    scheduleModulation();
  }

  private createXrayFlareLayer(xrayData: { short_wave?: number; long_wave?: number; flare_class?: string }): void {
    if (!this.audioContext || !this.masterGain) return;

    const xrayFlux = xrayData.short_wave || xrayData.long_wave || 0;
    const brightness = this.xrayToBrightness(xrayFlux);
    
    // Create a gain node for flare brightness
    this.flareLayerGain = this.audioContext.createGain();
    this.flareLayerGain.gain.value = brightness;
    
    // If there's a flare (M or X class), create a percussive event
    if (xrayData.flare_class && ['M', 'X'].includes(xrayData.flare_class[0])) {
      this.triggerFlareEvent(xrayData.flare_class, xrayFlux);
    }
  }

  private triggerFlareEvent(flareClass: string, intensity: number): void {
    if (!this.audioContext || !this.masterGain) return;
    
    const now = this.audioContext.currentTime;
    const timeSinceLastFlare = now - this.lastFlareTime;
    
    // Only trigger if it's been at least 2 seconds since last flare
    if (timeSinceLastFlare < 2.0) return;
    
    this.lastFlareTime = now;
    
    // Create percussive burst
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = flareClass[0] === 'X' ? 'square' : 'sawtooth';
    osc.frequency.value = 440 * (flareClass[0] === 'X' ? 2 : 1.5);
    
    filter.type = 'bandpass';
    filter.frequency.value = osc.frequency.value * 2;
    filter.Q.value = 10;
    
    // Sharp attack, quick decay
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(intensity * 0.5, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + 0.5);
  }

  private createProtonHarmonicLayer(protonFlux: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const harmonicCount = this.protonToHarmonicCount(protonFlux);
    
    // Get base frequency from current solar wind
    const baseFreq = this.baseLayerOscillators.length > 0 
      ? this.baseLayerOscillators[0].frequency.value 
      : 220;
    
    // Add harmonic layers
    for (let i = 0; i < harmonicCount; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      // Higher harmonics for higher flux
      const harmonicRatio = 5 + (i * 2); // 5th, 7th, 9th, etc.
      osc.type = 'triangle';
      osc.frequency.value = baseFreq * harmonicRatio;
      
      gain.gain.value = (0.2 / (i + 1)) * (protonFlux / 1000); // Scale with flux
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start();
      this.protonHarmonics.push(osc);
    }
  }

  private createElectronHighFreqLayer(electronFlux: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const highFreqCount = this.electronToHighFreqCount(electronFlux);
    
    // Get base frequency
    const baseFreq = this.baseLayerOscillators.length > 0 
      ? this.baseLayerOscillators[0].frequency.value 
      : 220;
    
    // Add high-frequency oscillators (5kHz+)
    for (let i = 0; i < highFreqCount; i++) {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.value = 5000 + (i * 2000); // 5kHz, 7kHz, 9kHz...
      
      filter.type = 'highpass';
      filter.frequency.value = osc.frequency.value * 0.8;
      
      gain.gain.value = (0.15 / (i + 1)) * (electronFlux / 10000); // Scale with flux
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start();
      this.electronHighFreq.push(osc);
    }
  }

  private createMagnetometerRumbleLayer(hComponent: number): void {
    if (!this.audioContext || !this.masterGain) return;

    const rumbleIntensity = this.magnetometerToRumble(hComponent);
    
    if (rumbleIntensity > 0.1) {
      this.magnetometerRumble = this.audioContext.createOscillator();
      this.magnetometerGain = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();
      
      this.magnetometerRumble.type = 'sawtooth';
      this.magnetometerRumble.frequency.value = 30 + (rumbleIntensity * 30); // 30-60 Hz
      
      filter.type = 'lowpass';
      filter.frequency.value = 100;
      filter.Q.value = 2;
      
      this.magnetometerGain.gain.value = rumbleIntensity * 0.3;
      
      this.magnetometerRumble.connect(filter);
      filter.connect(this.magnetometerGain);
      this.magnetometerGain.connect(this.masterGain);
      
      this.magnetometerRumble.start();
    }
  }

  public updateMultiParameter(data: ComprehensiveSpaceWeatherData): void {
    if (!this.audioContext) return;
    
    // If not active, start it
    if (!this.isActive) {
      this.startMultiParameter(data, 0.3);
      return;
    }
    
    this.currentData = data;
    const now = this.audioContext.currentTime;
    const smoothingTime = 0.1;

    // Update base layer frequency if solar wind changed
    if (data.solar_wind && this.baseLayerOscillators.length > 0) {
      const velocityRange = 800 - 200;
      const midiRange = 84 - 36;
      const velocityNormalized = Math.max(0, Math.min(1, (data.solar_wind.velocity - 200) / velocityRange));
      const midiNote = Math.round(36 + (velocityNormalized * midiRange));
      const newFreq = midiNoteToFrequency(midiNote);
      
      this.baseLayerOscillators.forEach((osc, index) => {
        const ratio = index === 0 ? 1.0 : index === 1 ? 2.0 : 3.0;
        osc.frequency.exponentialRampToValueAtTime(newFreq * ratio, now + smoothingTime);
      });
    }

    // Update K-index pulse rate
    if (data.k_index && this.kIndexLFO) {
      const newPulseRate = this.kIndexToPulseRate(data.k_index.kp);
      this.kIndexLFO.frequency.exponentialRampToValueAtTime(newPulseRate, now + smoothingTime);
    }

    // Check for new flares
    if (data.xray_flux) {
      const xrayFlux = data.xray_flux.short_wave || data.xray_flux.long_wave || 0;
      if (xrayFlux > 1e-6 && data.xray_flux.flare_class) {
        this.triggerFlareEvent(data.xray_flux.flare_class, xrayFlux);
      }
    }

    // Update proton harmonics
    if (data.proton_flux) {
      const currentCount = this.protonHarmonics.length;
      const newCount = this.protonToHarmonicCount(data.proton_flux.flux_10mev);
      
      if (newCount !== currentCount) {
        // Remove old harmonics
        this.protonHarmonics.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        this.protonHarmonics = [];
        
        // Create new harmonics
        this.createProtonHarmonicLayer(data.proton_flux.flux_10mev);
      }
    }

    // Update electron high-freq
    if (data.electron_flux) {
      const currentCount = this.electronHighFreq.length;
      const newCount = this.electronToHighFreqCount(data.electron_flux.flux_2mev);
      
      if (newCount !== currentCount) {
        this.electronHighFreq.forEach(osc => {
          try { osc.stop(); } catch (e) {}
        });
        this.electronHighFreq = [];
        
        this.createElectronHighFreqLayer(data.electron_flux.flux_2mev);
      }
    }

    // Update magnetometer rumble
    if (data.magnetometer) {
      const rumbleIntensity = this.magnetometerToRumble(data.magnetometer.h_component);
      
      if (rumbleIntensity > 0.1 && !this.magnetometerRumble) {
        this.createMagnetometerRumbleLayer(data.magnetometer.h_component);
      } else if (this.magnetometerRumble && this.magnetometerGain) {
        this.magnetometerGain.gain.exponentialRampToValueAtTime(rumbleIntensity * 0.3, now + smoothingTime);
      }
    }
  }

  public stopMultiParameter(): void {
    this.isActive = false;
    
    // Stop all oscillators
    this.baseLayerOscillators.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.baseLayerOscillators = [];
    
    this.protonHarmonics.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.protonHarmonics = [];
    
    this.electronHighFreq.forEach(osc => {
      try { osc.stop(); } catch (e) {}
    });
    this.electronHighFreq = [];
    
    if (this.kIndexLFO) {
      try { this.kIndexLFO.stop(); } catch (e) {}
      this.kIndexLFO = null;
    }
    
    if (this.kIndexPulseOsc) {
      try { this.kIndexPulseOsc.stop(); } catch (e) {}
      this.kIndexPulseOsc = null;
    }
    
    if (this.magnetometerRumble) {
      try { this.magnetometerRumble.stop(); } catch (e) {}
      this.magnetometerRumble = null;
    }
    
    this.layers.clear();
  }

  public dispose(): void {
    this.stopMultiParameter();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.masterGain = null;
  }
}

// Global instance
const multiParamEngine = new MultiParameterAudioEngine();

export const startMultiParameter = (data: ComprehensiveSpaceWeatherData, volume?: number): Promise<void> => {
  return multiParamEngine.startMultiParameter(data, volume);
};

export const updateMultiParameter = (data: ComprehensiveSpaceWeatherData): void => {
  multiParamEngine.updateMultiParameter(data);
};

export const stopMultiParameter = (): void => {
  multiParamEngine.stopMultiParameter();
};

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    multiParamEngine.dispose();
  });
}


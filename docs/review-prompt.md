You are reviewing a set of changes to the Heliosinger project -- a React + TypeScript web app that sonifies real-time space weather data using the Web Audio API. The changes fix a self-reinforcing fetch cascade, remove a legacy component, and upgrade audio parameter smoothing.

## What changed and why

**Problem:** The dashboard had a triple-fetch cascade: a `useQuery` with a `refetchInterval` callback called `setUpdateFrequency()` (React state), which re-triggered a `fetchDataMutation` setInterval effect, which fired an immediate POST, whose `onSuccess` invalidated queries, causing more renders. Meanwhile `useHeliosinger` ran a duplicate query for the same data. This caused chaotic re-renders, audio clicks from 100ms parameter jumps, hologram jerking, and narrator rapid-fire cycling.

**Solution across 4 files:**

1. `client/src/lib/adaptive-refetch.ts` -- Raised minimum poll floor from 10s to 15s
2. `client/src/lib/heliosinger-engine.ts` -- Replaced single `smoothingTime = 0.1` (100ms) with 9 named ramp constants (0.75s-5s), added `rampParam()`/`rampParamLinear()` helpers that cancel-and-snapshot before each ramp
3. `client/src/hooks/use-heliosinger.ts` -- Accepts `comprehensiveData` as a prop instead of running its own `useQuery`; added `hasStartedRef` to prevent start/restart cycles; added 5s throttle on audio updates
4. `client/src/pages/dashboard-heliosinger.tsx` -- Replaced `useState` for `updateFrequency` with a derived value; deleted `fetchDataMutation` and its auto-fetch `useEffect`; passed `comprehensiveData` to `useHeliosinger`; removed `DataDashboard` import and render

## What to check

1. **Correctness:** Are there any logic bugs, race conditions, or edge cases? Especially around:
   - The `hasStartedRef` guard in `useHeliosinger` -- can it get stuck (audio never starts)?
   - The 5s throttle -- does the cleanup function properly cancel pending timeouts? Can a stale closure fire after unmount?
   - The `rampParam` helper -- is `cancelScheduledValues` + `setValueAtTime(param.value, now)` the correct way to interrupt a running ramp in Web Audio?
   - The derived `updateFrequency` -- since it's recomputed on every render, do the secondary queries (`refetchInterval: () => updateFrequency`) behave correctly?

2. **React hook rules & dependency arrays:** Are any deps missing or stale? Are hooks called unconditionally and in consistent order? Does removing the `useQuery` from `useHeliosinger` while keeping it in `useHeliosingerPreview` cause any import or tree-shaking issues?

3. **Web Audio correctness:**
   - `exponentialRampToValueAtTime` requires target > 0. Are all `Math.max(0.001, ...)` guards correct and sufficient?
   - For `linearRampToValueAtTime` (pan, delayTime), is it correct to use `cancelScheduledValues` + `setValueAtTime` the same way?
   - Do the ramp durations (3s for pitch, 4s for formants, 5s for binaural) make musical sense, or could they cause audible artifacts like pitch slewing or formant smearing?

4. **Cascade elimination:** Is the fetch cascade actually fully broken? Trace through the data flow: `useQuery` -> `refetchInterval` callback -> derived `updateFrequency` -> secondary queries. Is there any remaining path where a state update triggers a re-render that triggers another fetch?

5. **Memory leaks / cleanup:** Are all `setTimeout`s cleaned up on unmount? Is the `pendingUpdateTimerRef` properly cleared?

6. **TypeScript:** Any type safety issues? The `UseHeliosingerOptions.comprehensiveData` is optional -- are all consumers handling `undefined` correctly?

7. **Anything else** that looks like a code quality issue, anti-pattern, or potential production bug.

Please be specific. For each issue found, cite the file, line number, and what the fix should be. If everything looks correct, say so and explain why.

---

## File 1: `client/src/lib/adaptive-refetch.ts`

```typescript
/**
 * Adaptive API Refetch Interval Calculation
 *
 * Adjusts API update frequency based on space weather activity:
 * - Faster updates during storms (more engaging)
 * - Slower updates during quiet periods (saves resources)
 */

import type { ComprehensiveSpaceWeatherData } from "@shared/schema";

/**
 * Calculate adaptive refetch interval based on space weather conditions
 *
 * @param data Current space weather data
 * @param previousData Previous data (for detecting rapid changes)
 * @returns Refetch interval in milliseconds
 */
export function calculateRefetchInterval(
  data: ComprehensiveSpaceWeatherData | undefined,
  previousData?: ComprehensiveSpaceWeatherData
): number {
  // Base interval: 60 seconds
  const BASE_INTERVAL = 60000;

  if (!data) {
    return BASE_INTERVAL;
  }

  const kp = data.k_index?.kp || 0;
  const velocity = data.solar_wind?.velocity || 0;

  // Check for rapid velocity changes
  let velocityChangeBonus = 0;
  if (previousData?.solar_wind?.velocity) {
    const velocityChange = Math.abs(velocity - previousData.solar_wind.velocity);
    if (velocityChange > 50) {
      velocityChangeBonus = 40000; // Reduce interval by 40 seconds
    }
  }

  // Determine interval based on Kp index
  let interval: number;

  if (kp >= 7) {
    // Extreme conditions: 15 seconds
    interval = 15000;
  } else if (kp >= 5) {
    // Storm conditions: 15 seconds
    interval = 15000;
  } else if (kp <= 2) {
    // Quiet conditions: 120 seconds
    interval = 120000;
  } else {
    // Moderate conditions: base interval
    interval = BASE_INTERVAL;
  }

  // Apply velocity change bonus (makes it faster if velocity is changing rapidly)
  interval = Math.max(15000, interval - velocityChangeBonus);

  return interval;
}

/**
 * Get a human-readable description of the current update frequency
 */
export function getUpdateFrequencyDescription(intervalMs: number): string {
  const seconds = Math.round(intervalMs / 1000);

  if (seconds < 20) {
    return `Very Fast (${seconds}s)`;
  } else if (seconds < 40) {
    return `Fast (${seconds}s)`;
  } else if (seconds < 80) {
    return `Normal (${seconds}s)`;
  } else {
    return `Slow (${seconds}s)`;
  }
}
```

---

## File 2: `client/src/lib/heliosinger-engine.ts`

```typescript
/**
 * Heliosinger Audio Engine
 *
 * Makes the sun literally sing space weather using vowel formant filters
 * and harmonic synthesis. The sun's "voice" changes based on solar wind
 * conditions, creating a poetic and scientifically accurate sonification.
 */

import type { HeliosingerData } from "./heliosinger-mapping";
import { debugLog, debugWarn } from "./debug";

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
          debugLog('AudioContext state:', this.audioContext?.state);
        };
        this.hasSetupStateHandler = true;
      }

      if (!this.audioContext) return;
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (e) {
          debugWarn('AudioContext resume() during unlock failed:', e);
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
        debugLog('Played iOS unlock buffer (ensureUnlocked)');
      } catch (unlockError) {
        debugWarn('Unlock buffer failed (non-critical):', unlockError);
      }
    } catch (error) {
      console.error('ensureUnlocked failed:', error);
      throw error instanceof Error ? error : new Error('Failed to unlock audio');
    }
  }

  private async initializeAudio(): Promise<void> {
    try {
      if (!this.audioContext) {
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
          throw new Error('Web Audio API is not supported in this browser');
        }
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (this.audioContext && !this.hasSetupStateHandler) {
        this.audioContext.onstatechange = () => {
          debugLog('AudioContext state:', this.audioContext?.state);
        };
        this.hasSetupStateHandler = true;
      }

      if (!this.masterGain) {
        this.masterGain = this.audioContext.createGain();
        this.compressor = this.audioContext.createDynamicsCompressor();
        this.limiter = this.audioContext.createDynamicsCompressor();

        this.compressor.threshold.value = -24;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        this.limiter.threshold.value = -6;
        this.limiter.knee.value = 1;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.1;

        this.delayNode = this.audioContext.createDelay(1.0);
        this.delayGain = this.audioContext.createGain();
        this.delayFeedbackGain = this.audioContext.createGain();

        this.reverbConvolver = this.audioContext.createConvolver();
        this.reverbGain = this.audioContext.createGain();

        this.masterGain.connect(this.delayNode);
        this.delayNode.connect(this.delayGain);
        this.delayGain.connect(this.reverbConvolver);
        this.reverbConvolver.connect(this.reverbGain);
        this.reverbGain.connect(this.compressor);
        this.compressor.connect(this.limiter);
        this.limiter.connect(this.audioContext.destination);

        this.delayNode.connect(this.delayFeedbackGain);
        this.delayFeedbackGain.connect(this.delayNode);

        this.masterGain.gain.value = this.targetVolume;

        this.createNoiseBuffer();
        this.createReverbImpulse();
      }

      if (this.audioContext.state === 'suspended') {
        try {
          const resumePromise = this.audioContext.resume();
          await resumePromise;

          if (this.audioContext.state === 'suspended') {
            debugWarn('Audio context still suspended after resume attempt');
            await this.audioContext.resume();
          }

          debugLog(`Audio context state: ${this.audioContext.state}`);

          try {
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
            source.stop(0.001);
            debugLog('Played iOS unlock buffer');
          } catch (unlockError) {
            debugWarn('iOS unlock buffer failed (non-critical):', unlockError);
          }
        } catch (resumeError) {
          console.error('Failed to resume audio context:', resumeError);
          throw new Error('Audio requires user interaction. Please tap the play button to enable audio.');
        }
      }

      if (this.audioContext.state === 'closed') {
        throw new Error('Audio context has been closed');
      }

      debugLog(`Audio context initialized: state=${this.audioContext.state}, sampleRate=${this.audioContext.sampleRate}Hz`);

      if (this.masterGain) {
        debugLog(`Master gain: value=${this.masterGain.gain.value}, connected=${this.masterGain.numberOfOutputs > 0}`);
      }
    } catch (error) {
      console.error('Failed to initialize audio:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize audio system');
    }
  }

  private createNoiseBuffer(): void {
    if (!this.audioContext) return;
    const bufferSize = this.audioContext.sampleRate * 2.0;
    this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  private createReverbImpulse(): void {
    if (!this.audioContext || !this.reverbConvolver) return;
    const length = this.audioContext.sampleRate * 2.0;
    const impulse = this.audioContext.createBuffer(2, length, this.audioContext.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - (i / length), 2);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.1;
      }
    }
    this.reverbConvolver.buffer = impulse;
  }

  public async startSinging(heliosingerData: HeliosingerData): Promise<void> {
    await this.initializeAudio();

    if (!this.audioContext || !this.masterGain) {
      throw new Error("Audio context not initialized");
    }

    if (this.isSinging) {
      this.stopSinging();
    }

    this.isSinging = true;
    this.currentData = heliosingerData;

    if (this.masterGain) {
      const targetVol = Math.max(0.001, this.targetVolume);
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(targetVol, now);
      debugLog(`Set master gain to ${(targetVol * 100).toFixed(0)}% before starting audio`);
    }

    this.configureReverbDelay(heliosingerData);
    this.heliosingerLayer = this.createHeliosingerLayer(heliosingerData);
    this.createModulationLayer(heliosingerData);
    this.createBinauralLayer(heliosingerData);
    this.createTextureLayer(heliosingerData);

    debugLog(`The sun is singing: "${heliosingerData.solarMood}"`);
    debugLog(`   Vowel: "${heliosingerData.currentVowel.displayName}" (${heliosingerData.currentVowel.description})`);
    debugLog(`   Note: ${heliosingerData.baseNote} at ${heliosingerData.frequency.toFixed(1)}Hz`);
    debugLog(`   Harmonics: ${heliosingerData.harmonicCount} partials`);
    debugLog(`   Condition: ${heliosingerData.condition}`);
    debugLog(`   Volume: ${(this.targetVolume * 100).toFixed(0)}%`);
  }

  private configureReverbDelay(data: HeliosingerData): void {
    if (!this.audioContext || !this.delayNode || !this.delayGain || !this.delayFeedbackGain || !this.reverbGain) return;
    const now = this.audioContext.currentTime;
    this.delayNode.delayTime.value = data.delayTime;
    this.delayGain.gain.value = data.delayGain;
    this.delayFeedbackGain.gain.value = data.delayFeedback;
    this.reverbGain.gain.value = data.reverbRoomSize * 0.3;
  }

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

    data.chordVoicing.forEach((chordTone, toneIndex) => {
      const toneLayer: ChordToneLayer = {
        osc: this.audioContext!.createOscillator(),
        oscGain: this.audioContext!.createGain(),
        formantFilters: [],
        formantGains: [],
        panner: this.audioContext!.createStereoPanner()
      };

      toneLayer.osc.type = 'sawtooth';
      toneLayer.osc.frequency.value = chordTone.frequency;
      toneLayer.oscGain.gain.value = chordTone.amplitude * 0.7;

      data.formantFilters.forEach((formant, i) => {
        const filter = this.audioContext!.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = formant.frequency;
        const calculatedQ = formant.frequency / formant.bandwidth;
        filter.Q.value = Math.min(15, Math.max(5, calculatedQ));

        const gain = this.audioContext!.createGain();
        gain.gain.value = formant.gain;

        toneLayer.formantFilters.push(filter);
        toneLayer.formantGains.push(gain);
        filter.connect(gain);
      });

      const panSpread = (data.stereoSpread - 0.5) * 2;
      const tonePanOffset = (toneIndex - (data.chordVoicing.length - 1) / 2) * 0.2;
      toneLayer.panner.pan.value = Math.max(-1, Math.min(1, panSpread * 0.7 + tonePanOffset));

      toneLayer.osc.connect(toneLayer.oscGain);
      toneLayer.formantFilters.forEach((filter, i) => {
        toneLayer.oscGain.connect(filter);
        toneLayer.formantGains[i].connect(toneLayer.panner);
      });
      toneLayer.panner.connect(layer.masterPanner);

      try {
        toneLayer.osc.start();
      } catch (error) {
        console.error(`Failed to start oscillator:`, error);
        throw error;
      }

      layer.chordToneLayers.push(toneLayer);
    });

    data.harmonicAmplitudes.forEach((amplitude, i) => {
      if (i === 0) return;
      const harmonicNumber = i + 1;
      const harmonicFreq = data.frequency * harmonicNumber;

      const osc = this.audioContext!.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = harmonicFreq;

      const gain = this.audioContext!.createGain();
      gain.gain.value = amplitude * 0.2;

      layer.harmonicOscs.push(osc);
      layer.harmonicGains.push(gain);

      osc.connect(gain);
      gain.connect(layer.masterPanner);
    });

    const panSpread = (data.stereoSpread - 0.5) * 2;
    layer.masterPanner.pan.value = panSpread * 0.3;
    layer.masterPanner.connect(this.masterGain);

    layer.harmonicOscs.forEach(osc => {
      try { osc.start(); } catch (error) {
        console.error(`Failed to start harmonic oscillator:`, error);
      }
    });

    return layer;
  }

  private createModulationLayer(data: HeliosingerData): void {
    if (!this.audioContext || !this.heliosingerLayer) return;

    if (data.vibratoDepth > 0) {
      this.modulationLayer.vibratoLfo = this.audioContext.createOscillator();
      this.modulationLayer.vibratoGain = this.audioContext.createGain();

      this.modulationLayer.vibratoLfo.type = 'sine';
      this.modulationLayer.vibratoLfo.frequency.value = data.vibratoRate;
      this.modulationLayer.vibratoGain.gain.value = data.vibratoDepth;

      this.modulationLayer.vibratoLfo.connect(this.modulationLayer.vibratoGain);
      this.heliosingerLayer.chordToneLayers.forEach(toneLayer => {
        this.modulationLayer.vibratoGain!.connect(toneLayer.osc.frequency);
      });
      this.heliosingerLayer.harmonicOscs.forEach(osc => {
        this.modulationLayer.vibratoGain!.connect(osc.frequency);
      });

      try { this.modulationLayer.vibratoLfo.start(); } catch (error) {
        console.error(`Failed to start vibrato LFO:`, error);
      }
    }

    if (data.tremoloDepth > 0.05) {
      this.modulationLayer.tremoloLfo = this.audioContext.createOscillator();
      this.modulationLayer.tremoloGain = this.audioContext.createGain();

      this.modulationLayer.tremoloLfo.type = data.tremoloRate > 4 ? 'square' : 'sine';
      this.modulationLayer.tremoloLfo.frequency.value = data.tremoloRate;
      this.modulationLayer.tremoloGain.gain.value = data.tremoloDepth * 0.5;

      this.modulationLayer.tremoloLfo.connect(this.modulationLayer.tremoloGain);
      this.heliosingerLayer.chordToneLayers.forEach(toneLayer => {
        toneLayer.formantGains.forEach(gain => {
          this.modulationLayer.tremoloGain!.connect(gain.gain);
        });
      });

      try { this.modulationLayer.tremoloLfo.start(); } catch (error) {
        console.error(`Failed to start tremolo LFO:`, error);
      }
    }
  }

  private createBinauralLayer(data: HeliosingerData): void {
    if (!this.audioContext || !this.masterGain) return;

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

  private createTextureLayer(data: HeliosingerData): void {
    if (!this.audioContext || !this.masterGain || !this.noiseBuffer) return;

    this.textureLayer.windSource = this.audioContext.createBufferSource();
    this.textureLayer.windGain = this.audioContext.createGain();
    this.textureLayer.windFilter = this.audioContext.createBiquadFilter();

    this.textureLayer.windSource.buffer = this.noiseBuffer;
    this.textureLayer.windSource.loop = true;

    this.textureLayer.windFilter.type = 'bandpass';
    const velocity = data.velocity || 350;
    const windFreq = 200 + ((velocity - 200) / 600) * 1000;
    this.textureLayer.windFilter.frequency.value = windFreq;
    this.textureLayer.windFilter.Q.value = 0.8;

    const density = data.density || 5;
    const windVol = Math.min(0.15, (density / 20) * 0.15);
    this.textureLayer.windGain.gain.value = windVol;

    this.textureLayer.windSource.connect(this.textureLayer.windFilter);
    this.textureLayer.windFilter.connect(this.textureLayer.windGain);
    this.textureLayer.windGain.connect(this.masterGain);

    try { this.textureLayer.windSource.start(); } catch (e) {
      console.error("Failed to start wind source", e);
    }

    if (data.shimmerGain > 0) {
      this.textureLayer.noiseSource = this.audioContext.createBufferSource();
      this.textureLayer.noiseGain = this.audioContext.createGain();
      this.textureLayer.noiseFilter = this.audioContext.createBiquadFilter();

      this.textureLayer.noiseSource.buffer = this.noiseBuffer;
      this.textureLayer.noiseSource.loop = true;

      this.textureLayer.noiseFilter.type = 'bandpass';
      this.textureLayer.noiseFilter.frequency.value = 4000;
      this.textureLayer.noiseFilter.Q.value = 2;

      this.textureLayer.noiseGain.gain.value = data.shimmerGain * 0.5;

      this.textureLayer.noiseSource.connect(this.textureLayer.noiseFilter);
      this.textureLayer.noiseFilter.connect(this.textureLayer.noiseGain);
      this.textureLayer.noiseGain.connect(this.masterGain);

      try { this.textureLayer.noiseSource.start(); } catch (error) {
        console.error(`Failed to start noise source:`, error);
      }
    }

    if (data.rumbleGain > 0) {
      this.textureLayer.rumbleOsc = this.audioContext.createOscillator();
      this.textureLayer.rumbleGain = this.audioContext.createGain();

      this.textureLayer.rumbleOsc.type = 'sine';
      this.textureLayer.rumbleOsc.frequency.value = 40;

      this.textureLayer.rumbleGain.gain.value = data.rumbleGain;

      this.textureLayer.rumbleOsc.connect(this.textureLayer.rumbleGain);
      this.textureLayer.rumbleGain.connect(this.masterGain);

      try { this.textureLayer.rumbleOsc.start(); } catch (error) {
        console.error(`Failed to start rumble oscillator:`, error);
      }
    }
  }

  // --- Musically appropriate ramp durations (seconds) ---
  private static readonly RAMP_FREQUENCY = 3.0;      // pitch glide
  private static readonly RAMP_GAIN = 0.75;           // amplitude -- avoids clicks
  private static readonly RAMP_FORMANT = 4.0;         // vowel crossfade -- slow choir morph
  private static readonly RAMP_FILTER = 1.5;          // filter cutoff
  private static readonly RAMP_PAN = 1.5;             // stereo movement
  private static readonly RAMP_REVERB_DELAY = 1.5;    // wet/dry/feedback
  private static readonly RAMP_MODULATION = 1.5;      // vibrato/tremolo rates
  private static readonly RAMP_BINAURAL = 5.0;        // very slow drift
  private static readonly RAMP_TEXTURE = 1.5;         // wind/shimmer/rumble

  /**
   * Cancel any pending ramp on `param`, snapshot its current value, then
   * schedule an exponential ramp to `target` over `duration` seconds.
   * Prevents ramp-stacking when updates arrive before a previous ramp completes.
   */
  private rampParam(param: AudioParam, target: number, duration: number): void {
    const now = this.audioContext!.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.exponentialRampToValueAtTime(target, now + duration);
  }

  /**
   * Same as rampParam but uses linearRampToValueAtTime (for pan, delayTime).
   */
  private rampParamLinear(param: AudioParam, target: number, duration: number): void {
    const now = this.audioContext!.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(target, now + duration);
  }

  /**
   * Update the sun's singing as space weather changes
   */
  public updateSinging(heliosingerData: HeliosingerData): void {
    if (!this.isSinging || !this.audioContext || !this.heliosingerLayer) return;

    if (this.audioContext.state === 'suspended') {
      debugWarn('AudioContext suspended during update, attempting resume...');
      this.audioContext.resume().catch(e => debugWarn('Resume failed:', e));
      return;
    } else if (this.audioContext.state !== 'running') {
      debugWarn('AudioContext not running during update, state:', this.audioContext.state);
      return;
    }

    // Update chord tone frequencies and formant filters
    heliosingerData.chordVoicing.forEach((chordTone, toneIndex) => {
      if (toneIndex >= this.heliosingerLayer!.chordToneLayers.length) return;

      const toneLayer = this.heliosingerLayer!.chordToneLayers[toneIndex];

      // Chord tone frequency -> slow pitch glide
      this.rampParam(toneLayer.osc.frequency,
        Math.max(20, chordTone.frequency),
        HeliosingerEngine.RAMP_FREQUENCY);

      // Chord tone gain
      this.rampParam(toneLayer.oscGain.gain,
        Math.max(0.001, chordTone.amplitude * 0.7),
        HeliosingerEngine.RAMP_GAIN);

      // Formant filters -- slow vowel crossfade
      heliosingerData.formantFilters.forEach((formant, i) => {
        if (i >= toneLayer.formantFilters.length) return;

        const filter = toneLayer.formantFilters[i];
        const gain = toneLayer.formantGains[i];

        this.rampParam(filter.frequency,
          Math.max(100, Math.min(20000, formant.frequency)),
          HeliosingerEngine.RAMP_FORMANT);

        this.rampParam(filter.Q,
          Math.max(0.1, formant.frequency / formant.bandwidth),
          HeliosingerEngine.RAMP_FORMANT);

        this.rampParam(gain.gain,
          Math.max(0.001, formant.gain),
          HeliosingerEngine.RAMP_FORMANT);
      });

      // Chord tone panning (linear)
      const panSpread = (heliosingerData.stereoSpread - 0.5) * 2;
      const tonePanOffset = (toneIndex - (heliosingerData.chordVoicing.length - 1) / 2) * 0.2;
      this.rampParamLinear(toneLayer.panner.pan,
        Math.max(-1, Math.min(1, panSpread * 0.7 + tonePanOffset)),
        HeliosingerEngine.RAMP_PAN);
    });

    // Update harmonic frequencies and gains
    heliosingerData.harmonicAmplitudes.forEach((amplitude, i) => {
      if (i === 0 || i >= this.heliosingerLayer!.harmonicOscs.length) return;

      const osc = this.heliosingerLayer!.harmonicOscs[i - 1];
      const gain = this.heliosingerLayer!.harmonicGains[i - 1];
      const harmonicNumber = i + 1;
      const targetFreq = heliosingerData.frequency * harmonicNumber;

      this.rampParam(osc.frequency,
        Math.max(20, targetFreq),
        HeliosingerEngine.RAMP_FREQUENCY);

      this.rampParam(gain.gain,
        Math.max(0.001, amplitude * 0.2),
        HeliosingerEngine.RAMP_GAIN);
    });

    // Master stereo panning (linear)
    const panSpread = (heliosingerData.stereoSpread - 0.5) * 2;
    this.rampParamLinear(this.heliosingerLayer.masterPanner.pan,
      Math.max(-1, Math.min(1, panSpread * 0.3)),
      HeliosingerEngine.RAMP_PAN);

    // Reverb and delay
    if (this.delayNode && this.delayGain && this.delayFeedbackGain && this.reverbGain) {
      this.rampParamLinear(this.delayNode.delayTime,
        Math.max(0.05, Math.min(1.0, heliosingerData.delayTime)),
        HeliosingerEngine.RAMP_REVERB_DELAY);

      this.rampParam(this.delayGain.gain,
        Math.max(0.001, Math.min(0.4, heliosingerData.delayGain)),
        HeliosingerEngine.RAMP_REVERB_DELAY);

      this.rampParam(this.delayFeedbackGain.gain,
        Math.max(0.001, Math.min(0.5, heliosingerData.delayFeedback)),
        HeliosingerEngine.RAMP_REVERB_DELAY);

      this.rampParam(this.reverbGain.gain,
        Math.max(0.001, Math.min(0.5, heliosingerData.reverbRoomSize * 0.3)),
        HeliosingerEngine.RAMP_REVERB_DELAY);
    }

    // Modulation: vibrato
    if (this.modulationLayer.vibratoLfo && this.modulationLayer.vibratoGain) {
      this.rampParam(this.modulationLayer.vibratoLfo.frequency,
        Math.max(0.1, heliosingerData.vibratoRate),
        HeliosingerEngine.RAMP_MODULATION);

      this.rampParam(this.modulationLayer.vibratoGain.gain,
        Math.max(0.1, heliosingerData.vibratoDepth),
        HeliosingerEngine.RAMP_MODULATION);
    }

    // Modulation: tremolo
    if (this.modulationLayer.tremoloLfo && this.modulationLayer.tremoloGain) {
      this.rampParam(this.modulationLayer.tremoloLfo.frequency,
        Math.max(0.1, heliosingerData.tremoloRate),
        HeliosingerEngine.RAMP_MODULATION);

      this.rampParam(this.modulationLayer.tremoloGain.gain,
        Math.max(0.01, heliosingerData.tremoloDepth * 0.5),
        HeliosingerEngine.RAMP_MODULATION);
    }

    // Binaural layer -- very slow drift
    if (this.binauralLayer.leftOsc && this.binauralLayer.rightOsc && this.binauralLayer.leftGain && this.binauralLayer.rightGain) {
      const base = Math.max(20, heliosingerData.binauralBaseHz);
      const offset = Math.max(0.5, heliosingerData.binauralBeatHz / 2);
      const safeMix = Math.max(0.001, Math.max(0.02, heliosingerData.binauralMix));

      this.rampParam(this.binauralLayer.leftOsc.frequency,
        Math.max(20, base - offset),
        HeliosingerEngine.RAMP_BINAURAL);

      this.rampParam(this.binauralLayer.rightOsc.frequency,
        Math.max(20, base + offset),
        HeliosingerEngine.RAMP_BINAURAL);

      this.rampParam(this.binauralLayer.leftGain.gain, safeMix, HeliosingerEngine.RAMP_BINAURAL);
      this.rampParam(this.binauralLayer.rightGain.gain, safeMix, HeliosingerEngine.RAMP_BINAURAL);
    }

    // Texture layer
    if (this.textureLayer.windGain && this.textureLayer.windFilter) {
      const velocity = heliosingerData.velocity || 350;
      const density = heliosingerData.density || 5;

      const targetWindFreq = 200 + ((velocity - 200) / 600) * 1000;
      this.rampParam(this.textureLayer.windFilter.frequency,
        Math.max(100, targetWindFreq),
        HeliosingerEngine.RAMP_TEXTURE);

      const targetWindVol = Math.min(0.15, (density / 20) * 0.15);
      this.rampParam(this.textureLayer.windGain.gain,
        Math.max(0.001, targetWindVol),
        HeliosingerEngine.RAMP_TEXTURE);
    }

    if (this.textureLayer.noiseGain && heliosingerData.shimmerGain > 0) {
      this.rampParam(this.textureLayer.noiseGain.gain,
        Math.max(0.001, heliosingerData.shimmerGain * 0.5),
        HeliosingerEngine.RAMP_TEXTURE);
    }

    if (this.textureLayer.rumbleGain && heliosingerData.rumbleGain > 0) {
      this.rampParam(this.textureLayer.rumbleGain.gain,
        Math.max(0.001, heliosingerData.rumbleGain),
        HeliosingerEngine.RAMP_TEXTURE);
    }

    // Don't override user volume - volume is controlled by setVolume()

    // Log vowel changes
    if (this.currentData && this.currentData.vowelName !== heliosingerData.vowelName) {
      debugLog(`Vowel change: "${this.currentData.vowelName}" -> "${heliosingerData.vowelName}"`);
      debugLog(`   ${heliosingerData.solarMood}`);
    }

    this.currentData = heliosingerData;
  }

  public stopSinging(): void {
    if (!this.isSinging) return;
    this.isSinging = false;

    if (this.heliosingerLayer) {
      this.heliosingerLayer.chordToneLayers.forEach(toneLayer => {
        try {
          toneLayer.osc.stop();
          toneLayer.osc.disconnect();
          toneLayer.oscGain.disconnect();
          toneLayer.panner.disconnect();
          toneLayer.formantFilters.forEach(filter => filter.disconnect());
          toneLayer.formantGains.forEach(gain => gain.disconnect());
        } catch (e) {}
      });
      this.heliosingerLayer.harmonicOscs.forEach((osc, i) => {
        try {
          osc.stop();
          osc.disconnect();
          this.heliosingerLayer!.harmonicGains[i]?.disconnect();
        } catch (e) {}
      });
      try { this.heliosingerLayer.masterPanner.disconnect(); } catch (e) {}
      this.heliosingerLayer = null;
    }

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
    debugLog('The sun has stopped singing');
  }

  public setVolume(volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.targetVolume = clampedVolume;

    if (this.masterGain && this.audioContext) {
      const now = this.audioContext.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.exponentialRampToValueAtTime(
        Math.max(0.001, this.targetVolume),
        now + 0.1
      );
    }
  }

  public isSingingActive(): boolean {
    return this.isSinging;
  }

  public getCurrentData(): HeliosingerData | null {
    return this.currentData;
  }

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

const heliosingerEngine = new HeliosingerEngine();

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

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    heliosingerEngine.dispose();
  });
}
```

---

## File 3: `client/src/hooks/use-heliosinger.ts`

```typescript
import { useEffect, useRef, useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  mapSpaceWeatherToHeliosinger,
  createDefaultHeliosingerMapping,
  createMappingContext,
} from '@/lib/heliosinger-mapping';
import { startSinging, updateSinging, stopSinging, setSingingVolume, ensureAudioUnlocked } from '@/lib/heliosinger-engine';
import { apiRequest } from '@/lib/queryClient';
import { getAmbientSettings } from '@/lib/localStorage';
import { checkAndNotifyEvents, requestNotificationPermission, canSendNotifications } from '@/lib/notifications';
import { debugLog } from '@/lib/debug';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface UseHeliosingerOptions {
  enabled: boolean;
  volume?: number;
  backgroundMode?: boolean;
  comprehensiveData?: ComprehensiveSpaceWeatherData;
  onError?: (error: Error) => void;
}

interface UseHeliosingerReturn {
  isSinging: boolean;
  currentData: ReturnType<typeof mapSpaceWeatherToHeliosinger> | null;
  start: () => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
  backgroundMode: boolean;
  unlock: () => Promise<void>;
}

export function useHeliosinger(options: UseHeliosingerOptions): UseHeliosingerReturn {
  const { enabled, volume = 0.3, backgroundMode: backgroundModeProp = false, comprehensiveData, onError } = options;
  const queryClient = useQueryClient();
  const [isSinging, setIsSinging] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState(backgroundModeProp);
  const currentDataRef = useRef<ReturnType<typeof mapSpaceWeatherToHeliosinger> | null>(null);
  const previousDataRef = useRef<ComprehensiveSpaceWeatherData | null>(null);
  const mappingContextRef = useRef(createMappingContext());
  const hasStartedRef = useRef(false);
  const lastUpdateTimeRef = useRef(0);
  const pendingUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (enabled && !canSendNotifications()) {
      requestNotificationPermission().then(permission => {
        if (permission === 'granted') {
          debugLog('Notification permission granted');
        }
      });
    }
  }, [enabled]);

  useEffect(() => {
    const settings = getAmbientSettings();
    if (settings?.background_mode === 'true') {
      setBackgroundMode(true);
    }
  }, []);

  useEffect(() => {
    if (!backgroundMode || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden && isSinging) {
        debugLog('Tab hidden - audio continues in background mode');
      } else if (!document.hidden && isSinging) {
        debugLog('Tab visible - audio continues');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [backgroundMode, enabled, isSinging]);

  // Start singing when enabled and data is available (with hasStartedRef guard)
  useEffect(() => {
    let isMounted = true;

    const startAudio = async () => {
      if (!enabled || !comprehensiveData) return;

      try {
        const heliosingerData = mapSpaceWeatherToHeliosinger(
          comprehensiveData,
          mappingContextRef.current,
          { now: Date.now() }
        );
        currentDataRef.current = heliosingerData;

        await startSinging(heliosingerData);
        if (isMounted) {
          setIsSinging(true);
          hasStartedRef.current = true;
        }

        setSingingVolume(volume);

        debugLog('Heliosinger started:', {
          note: heliosingerData.baseNote,
          frequency: heliosingerData.frequency.toFixed(1) + ' Hz',
          vowel: heliosingerData.currentVowel.displayName,
          mood: heliosingerData.solarMood,
          harmonics: heliosingerData.harmonicCount,
          condition: heliosingerData.condition,
          kpIndex: heliosingerData.kIndex
        });
      } catch (error) {
        console.error('Failed to start Heliosinger:', error);
        if (isMounted) {
          setIsSinging(false);
          hasStartedRef.current = false;
        }
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to start audio'));
        }
      }
    };

    if (enabled && comprehensiveData && !isSinging && !hasStartedRef.current) {
      startAudio();
    } else if (!enabled && isSinging) {
      stopSinging();
      setIsSinging(false);
      hasStartedRef.current = false;
    }

    return () => {
      isMounted = false;
      if (!enabled && isSinging) {
        stopSinging();
        setIsSinging(false);
        hasStartedRef.current = false;
      }
    };
  }, [enabled, comprehensiveData, isSinging, onError]);

  // Update singing when data changes -- throttled to max once per 5 seconds
  useEffect(() => {
    if (!enabled || !comprehensiveData || !isSinging) return;

    const doUpdate = () => {
      try {
        const heliosingerData = mapSpaceWeatherToHeliosinger(
          comprehensiveData,
          mappingContextRef.current,
          { now: Date.now() }
        );
        const previousData = currentDataRef.current;
        const previousComprehensiveData = previousDataRef.current;
        currentDataRef.current = heliosingerData;

        if (previousComprehensiveData && comprehensiveData) {
          const previousKp = previousComprehensiveData.k_index?.kp;
          const currentKp = comprehensiveData.k_index?.kp;
          const previousCondition = previousData?.condition;
          const currentCondition = heliosingerData.condition;
          const previousVelocity = previousComprehensiveData.solar_wind?.velocity;
          const currentVelocity = comprehensiveData.solar_wind?.velocity;
          const previousBz = previousComprehensiveData.solar_wind?.bz;
          const currentBz = comprehensiveData.solar_wind?.bz;

          checkAndNotifyEvents({
            previousKp,
            currentKp,
            previousCondition,
            currentCondition,
            previousVelocity,
            currentVelocity,
            previousBz,
            currentBz,
          });
        }

        if (!previousData ||
            Math.abs(heliosingerData.frequency - previousData.frequency) > 10 ||
            heliosingerData.condition !== previousData.condition ||
            heliosingerData.vowelName !== previousData.vowelName ||
            heliosingerData.harmonicCount !== previousData.harmonicCount) {
          debugLog('Heliosinger updated:', {
            note: heliosingerData.baseNote,
            frequency: heliosingerData.frequency.toFixed(1) + ' Hz',
            vowel: heliosingerData.currentVowel.displayName,
            mood: heliosingerData.solarMood,
            harmonics: heliosingerData.harmonicCount,
            condition: heliosingerData.condition,
            kpIndex: heliosingerData.kIndex
          });
        }

        updateSinging(heliosingerData);

        previousDataRef.current = comprehensiveData;
        lastUpdateTimeRef.current = Date.now();
      } catch (error) {
        console.error('Failed to update Heliosinger:', error);
        if (onError) {
          onError(error instanceof Error ? error : new Error('Failed to update audio'));
        }
      }
    };

    const elapsed = Date.now() - lastUpdateTimeRef.current;
    const MIN_UPDATE_INTERVAL = 5000; // 5 seconds

    if (elapsed >= MIN_UPDATE_INTERVAL) {
      doUpdate();
    } else {
      const delay = MIN_UPDATE_INTERVAL - elapsed;
      pendingUpdateTimerRef.current = setTimeout(doUpdate, delay);
      return () => {
        if (pendingUpdateTimerRef.current) {
          clearTimeout(pendingUpdateTimerRef.current);
          pendingUpdateTimerRef.current = null;
        }
      };
    }
  }, [comprehensiveData, enabled, isSinging, onError]);

  useEffect(() => {
    if (enabled && isSinging) {
      setSingingVolume(volume);
    }
  }, [volume, enabled, isSinging]);

  const start = useCallback(async () => {
    if (isSinging) return;

    try {
      await ensureAudioUnlocked();

      const response = await apiRequest('GET', '/api/space-weather/comprehensive');
      const data = (await response.json()) as ComprehensiveSpaceWeatherData;

      const heliosingerData = mapSpaceWeatherToHeliosinger(
        data,
        mappingContextRef.current,
        { now: Date.now() }
      );
      currentDataRef.current = heliosingerData;

      await startSinging(heliosingerData);
      setSingingVolume(volume);
      setIsSinging(true);

      queryClient.invalidateQueries({ queryKey: ['/api/space-weather/comprehensive'] });
    } catch (error) {
      console.error('Failed to start Heliosinger:', error);
      setIsSinging(false);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Failed to start audio'));
      }
      throw error;
    }
  }, [volume, onError, queryClient, isSinging]);

  const stop = useCallback(() => {
    if (!isSinging) return;
    stopSinging();
    setIsSinging(false);
    currentDataRef.current = null;
  }, [isSinging]);

  const setVolume = useCallback((newVolume: number) => {
    setSingingVolume(newVolume);
  }, []);

  const unlock = useCallback(async () => {
    await ensureAudioUnlocked();
  }, []);

  return {
    isSinging,
    currentData: currentDataRef.current,
    start,
    stop,
    setVolume,
    backgroundMode,
    unlock,
  };
}

export function useDashboardHeliosinger() {
  const [isHeliosingerMode, setIsHeliosingerMode] = useState(false);
  const [volume, setVolume] = useState(0.3);

  const heliosinger = useHeliosinger({
    enabled: isHeliosingerMode,
    volume,
    onError: (error) => {
      console.error('Heliosinger error:', error);
      setIsHeliosingerMode(false);
    }
  });

  const toggleHeliosingerMode = useCallback((enabled: boolean) => {
    if (enabled && !heliosinger.isSinging) {
      heliosinger.unlock().then(() => heliosinger.start()).catch(console.error);
    } else if (!enabled && heliosinger.isSinging) {
      heliosinger.stop();
    }
    setIsHeliosingerMode(enabled);
  }, [heliosinger]);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (isHeliosingerMode) {
      heliosinger.setVolume(newVolume);
    }
  }, [isHeliosingerMode, heliosinger]);

  return {
    isHeliosingerMode,
    toggleHeliosingerMode,
    volume,
    updateVolume,
    heliosinger,
  };
}

export function useHeliosingerPreview() {
  const mappingContextRef = useRef(createMappingContext());
  const { data: comprehensiveData } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ['/api/space-weather/comprehensive-preview'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/space-weather/comprehensive');
      return (await response.json()) as ComprehensiveSpaceWeatherData;
    },
    enabled: false,
  });

  const getCurrentMapping = useCallback(() => {
    if (!comprehensiveData) {
      return createDefaultHeliosingerMapping();
    }
    return mapSpaceWeatherToHeliosinger(
      comprehensiveData,
      mappingContextRef.current,
      { now: Date.now() }
    );
  }, [comprehensiveData]);

  const previewMapping = useCallback(async () => {
    const response = await apiRequest('GET', '/api/space-weather/comprehensive');
    const data = (await response.json()) as ComprehensiveSpaceWeatherData;
    return mapSpaceWeatherToHeliosinger(
      data,
      mappingContextRef.current,
      { now: Date.now() }
    );
  }, []);

  return {
    getCurrentMapping,
    previewMapping,
    data: comprehensiveData,
  };
}
```

---

## File 4: `client/src/pages/dashboard-heliosinger.tsx`

This file is very long (1294 lines). The key changed sections are:

- **Lines 68-104**: Query moved before `useHeliosinger`; `comprehensiveData` passed as prop; `updateFrequency` derived instead of state
- **Lines 444** (area): `fetchDataMutation` and its `useEffect` auto-fetch loop are deleted
- **Lines 595-601**: Error-state retry button uses `queryClient.invalidateQueries` instead of `fetchDataMutation.mutate()`
- **Lines 671-679**: Nav refresh button uses `queryClient.invalidateQueries` instead of `fetchDataMutation.mutate()`
- **Line 19**: `DataDashboard` import removed
- **Lines 1228**: `DataDashboard` render block removed

The full file is included below:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef, useMemo, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Settings } from "lucide-react";
import { Link } from "wouter";
import { SystemStatus } from "@/components/system-status";
import { Footer } from "@/components/Footer";
import { EventsTicker } from "@/components/EventsTicker";
import { MobilePlayer } from "@/components/MobilePlayer";
import { BrutalistLogo } from "@/components/BrutalistLogo";
import { SonificationTrainer } from "@/components/SonificationTrainer";
import { EducationalInsight } from "@/components/stream-enhancements/EducationalInsight";
const SolarHologram = lazy(() => import("@/components/SolarHologram").then(m => ({ default: m.SolarHologram })));
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getAmbientSettings, saveAmbientSettings } from "@/lib/localStorage";
import { useHeliosinger } from "@/hooks/use-heliosinger";
import { useEducationalNarrator } from "@/hooks/use-educational-narrator";
import {
  createMappingContext,
  mapSpaceWeatherToHeliosinger,
} from "@/lib/heliosinger-mapping";
import { debugLog, debugWarn } from "@/lib/debug";
import {
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  isNotificationSupported,
  canSendNotifications
} from "@/lib/notifications";
import { calculateRefetchInterval, getUpdateFrequencyDescription } from "@/lib/adaptive-refetch";
import { getChordQuality } from "@/lib/chord-utils";
import type { AmbientSettings, ComprehensiveSpaceWeatherData, SolarWindReading, SystemStatus as SystemStatusType } from "@shared/schema";

type ImplicationTone = "calm" | "watch" | "alert";
type Implication = { title: string; detail: string; tone: ImplicationTone };
const IMPLICATION_TONE_STYLES: Record<ImplicationTone, string> = {
  calm: "border-emerald-400/40 text-emerald-200 bg-emerald-500/10",
  watch: "border-amber-400/40 text-amber-200 bg-amber-500/10",
  alert: "border-destructive/60 text-destructive bg-destructive/10",
};

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isHeliosingerEnabled, setIsHeliosingerEnabled] = useState(true);
  const [ambientVolume, setAmbientVolume] = useState(0.4);
  const [backgroundMode, setBackgroundMode] = useState(true);

  const [showAdvancedAudio, setShowAdvancedAudio] = useState(false);
  const [showAdvancedAlerts, setShowAdvancedAlerts] = useState(false);

  const toggleInProgressRef = useRef(false);
  const backgroundModeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const volumeAudioDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const previousComprehensiveDataRef = useRef<ComprehensiveSpaceWeatherData | undefined>(undefined);
  const mappingContextRef = useRef(createMappingContext());

  // Fetch comprehensive space weather data -- single polling source for the whole dashboard
  const { data: comprehensiveData, isLoading: comprehensiveLoading } = useQuery<ComprehensiveSpaceWeatherData>({
    queryKey: ["/api/space-weather/comprehensive"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/space-weather/comprehensive");
      return (await response.json()) as ComprehensiveSpaceWeatherData;
    },
    refetchInterval: (query) => {
      const currentData = query.state.data;
      const interval = calculateRefetchInterval(currentData, previousComprehensiveDataRef.current);
      if (currentData) {
        previousComprehensiveDataRef.current = currentData;
      }
      return interval;
    },
  });

  // Derive update frequency from current data (no state -> no re-render cascade)
  const updateFrequency = calculateRefetchInterval(comprehensiveData, previousComprehensiveDataRef.current);

  const heliosinger = useHeliosinger({
    enabled: isHeliosingerEnabled,
    volume: ambientVolume,
    backgroundMode: backgroundMode,
    comprehensiveData,
    onError: (error) => {
      toast({
        title: "Heliosinger Error",
        description: error.message,
        variant: "destructive",
      });
      setIsHeliosingerEnabled(false);
    }
  });

  // ... (rest of dashboard -- network handlers, implications, UI rendering)
  // Key changes:
  // - fetchDataMutation and its auto-fetch useEffect are DELETED
  // - Retry/refresh buttons use queryClient.invalidateQueries() instead
  // - DataDashboard import and <DataDashboard /> render block are DELETED
}
```

(The full 1294-line file was provided earlier for complete context. The JSX rendering, implications logic, notification settings, etc. are unchanged from the original except for the specific deletions and substitutions noted above.)

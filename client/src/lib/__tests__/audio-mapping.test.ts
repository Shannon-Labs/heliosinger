import { describe, it, expect, beforeEach } from 'vitest';
import { 
  mapSpaceWeatherToAudio, 
  createDefaultAudioMapping,
  type EnhancedChordData 
} from '../audio-mapping';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

describe('Audio Mapping Framework', () => {
  describe('mapSpaceWeatherToAudio', () => {
    const createTestData = (overrides: Partial<ComprehensiveSpaceWeatherData['solar_wind']> = {}): ComprehensiveSpaceWeatherData => ({
      timestamp: new Date().toISOString(),
      solar_wind: {
        timestamp: new Date().toISOString(),
        velocity: 400,
        density: 5,
        bz: -5,
        bx: 2,
        by: -1,
        bt: 8,
        temperature: 50000,
        ...overrides
      },
      k_index: {
        timestamp: new Date().toISOString(),
        kp: 3,
        a_running: 15
      },
      xray_flux: null,
      proton_flux: null,
      electron_flux: null,
      magnetometer: null
    });

    it('should map quiet conditions correctly', () => {
      const data = createTestData({
        velocity: 300,
        density: 3,
        bz: 5,
        kp: 1
      });
      
      const result = mapSpaceWeatherToAudio(data);
      
      expect(result.condition).toBe('quiet');
      expect(result.frequency).toBeGreaterThan(65); // C2
      expect(result.frequency).toBeLessThan(1047); // C6
      expect(result.harmonicCount).toBeGreaterThanOrEqual(1);
      expect(result.harmonicCount).toBeLessThanOrEqual(8);
      expect(result.stereoSpread).toBeLessThan(0.5); // Northward Bz = narrow
    });

    it('should map storm conditions correctly', () => {
      const data = createTestData({
        velocity: 650,
        density: 15,
        bz: -15,
        kp: 6
      });
      
      const result = mapSpaceWeatherToAudio(data);
      
      expect(result.condition).toBe('storm');
      expect(result.frequency).toBeGreaterThan(200); // Higher velocity = higher pitch
      expect(result.vibratoDepth).toBeGreaterThan(20); // Southward Bz = more vibrato
      expect(result.stereoSpread).toBeGreaterThan(0.5); // Southward Bz = wide stereo
      expect(result.tremoloRate).toBeGreaterThan(4); // Kp = 6 = fast pulsing
      expect(result.tremoloDepth).toBeGreaterThan(0.5);
    });

    it('should map extreme conditions correctly', () => {
      const data = createTestData({
        velocity: 750,
        density: 20,
        bz: -18,
        kp: 8
      });
      
      const result = mapSpaceWeatherToAudio(data);
      
      expect(result.condition).toBe('extreme');
      expect(result.rumbleGain).toBeGreaterThan(0); // Extreme = sub-bass rumble
      expect(result.stereoSpread).toBeGreaterThan(0.8); // Very wide stereo
    });

    it('should use pentatonic scale for pitch mapping', () => {
      const data1 = createTestData({ velocity: 200 }); // Min velocity
      const data2 = createTestData({ velocity: 800 }); // Max velocity
      
      const result1 = mapSpaceWeatherToAudio(data1);
      const result2 = mapSpaceWeatherToAudio(data2);
      
      // Both should be in pentatonic scale (no semitones between them)
      const semitoneDiff = Math.abs(result2.midiNote - result1.midiNote);
      const pentatonicIntervals = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // Up to 2 octaves
      
      expect(pentatonicIntervals).toContain(semitoneDiff);
    });

    it('should map density to harmonic count correctly', () => {
      const lowDensityData = createTestData({ density: 0.5 }); // Min density
      const highDensityData = createTestData({ density: 50 }); // Max density
      
      const lowResult = mapSpaceWeatherToAudio(lowDensityData);
      const highResult = mapSpaceWeatherToAudio(highDensityData);
      
      expect(lowResult.harmonicCount).toBeLessThan(highResult.harmonicCount);
      expect(lowResult.harmonicCount).toBeGreaterThanOrEqual(1);
      expect(highResult.harmonicCount).toBeLessThanOrEqual(8);
    });

    it('should map temperature to spectral tilt', () => {
      const coldData = createTestData({ temperature: 10000 });
      const hotData = createTestData({ temperature: 200000 });
      
      const coldResult = mapSpaceWeatherToAudio(coldData);
      const hotResult = mapSpaceWeatherToAudio(hotData);
      
      // Hotter temperature should result in brighter sound (higher filter frequency)
      expect(hotResult.filterFrequency).toBeGreaterThan(coldResult.filterFrequency);
      expect(hotResult.shimmerGain).toBeGreaterThan(coldResult.shimmerGain);
    });

    it('should map Bz to stereo spread and vibrato', () => {
      const northwardData = createTestData({ bz: 10 });
      const southwardData = createTestData({ bz: -10 });
      
      const northwardResult = mapSpaceWeatherToAudio(northwardData);
      const southwardResult = mapSpaceWeatherToAudio(southwardData);
      
      // Southward Bz should create wider stereo and more vibrato
      expect(southwardResult.stereoSpread).toBeGreaterThan(northwardResult.stereoSpread);
      expect(southwardResult.vibratoDepth).toBeGreaterThan(northwardResult.vibratoDepth);
      expect(southwardResult.detuneCents).not.toBe(0); // Southward creates detuning
      expect(northwardResult.detuneCents).toBe(0); // Northward no detuning
    });

    it('should map K-index to rhythmic parameters', () => {
      const quietData = createTestData({ kp: 1 });
      const stormyData = createTestData({ kp: 7 });
      
      const quietResult = mapSpaceWeatherToAudio(quietData);
      const stormyResult = mapSpaceWeatherToAudio(stormyData);
      
      expect(stormyResult.tremoloRate).toBeGreaterThan(quietResult.tremoloRate);
      expect(stormyResult.tremoloDepth).toBeGreaterThan(quietResult.tremoloDepth);
      expect(stormyResult.kIndex).toBeGreaterThan(quietResult.kIndex);
    });

    it('should handle missing optional parameters gracefully', () => {
      const minimalData: ComprehensiveSpaceWeatherData = {
        timestamp: new Date().toISOString(),
        solar_wind: {
          timestamp: new Date().toISOString(),
          velocity: 400,
          density: 5,
          bz: -5,
          temperature: 50000
        },
        k_index: null,
        xray_flux: null,
        proton_flux: null,
        electron_flux: null,
        magnetometer: null
      };
      
      const result = mapSpaceWeatherToAudio(minimalData);
      
      expect(result.kIndex).toBe(0); // Default when no K-index
      expect(result.condition).toBeDefined();
      expect(result.frequency).toBeGreaterThan(0);
    });

    it('should clamp parameters to valid ranges', () => {
      const extremeData = createTestData({
        velocity: 1000, // Above max
        density: 100, // Above max
        bz: -30, // Below min
        temperature: 300000, // Above max
        kp: 10 // Above max
      });
      
      const result = mapSpaceWeatherToAudio(extremeData);
      
      expect(result.frequency).toBeLessThanOrEqual(1047); // Should not exceed C6
      expect(result.harmonicCount).toBeLessThanOrEqual(8); // Max 8 harmonics
      expect(result.tremoloRate).toBeLessThanOrEqual(8); // Max 8 Hz
      expect(result.condition).toBe('extreme');
    });
  });

  describe('createDefaultAudioMapping', () => {
    it('should create valid default mapping', () => {
      const defaultMapping = createDefaultAudioMapping();
      
      expect(defaultMapping.frequency).toBeGreaterThan(0);
      expect(defaultMapping.harmonicCount).toBeGreaterThan(0);
      expect(defaultMapping.condition).toBe('quiet');
      expect(defaultMapping.leftGain).toBeGreaterThan(0);
      expect(defaultMapping.rightGain).toBeGreaterThan(0);
      expect(defaultMapping.stereoSpread).toBeGreaterThanOrEqual(0);
      expect(defaultMapping.stereoSpread).toBeLessThanOrEqual(1);
    });

    it('should have all required fields', () => {
      const defaultMapping = createDefaultAudioMapping();
      const requiredFields: (keyof EnhancedChordData)[] = [
        'baseNote',
        'frequency',
        'midiNote',
        'decayTime',
        'detuneCents',
        'condition',
        'density',
        'velocity',
        'stereoSpread',
        'leftGain',
        'rightGain',
        'harmonicCount',
        'harmonicAmplitudes',
        'vibratoDepth',
        'vibratoRate',
        'tremoloRate',
        'tremoloDepth',
        'filterFrequency',
        'filterQ',
        'shimmerGain',
        'rumbleGain'
      ];
      
      requiredFields.forEach(field => {
        expect(defaultMapping).toHaveProperty(field);
      });
    });
  });

  describe('Physical relationships', () => {
    it('should represent velocity-density anticorrelation', () => {
      // Fast, tenuous wind
      const fastTenuous = mapSpaceWeatherToAudio(createTestData({
        velocity: 700,
        density: 2
      }));
      
      // Slow, dense wind  
      const slowDense = mapSpaceWeatherToAudio(createTestData({
        velocity: 250,
        density: 20
      }));
      
      // Fast tenuous should have higher pitch but fewer harmonics
      expect(fastTenuous.frequency).toBeGreaterThan(slowDense.frequency);
      expect(fastTenuous.harmonicCount).toBeLessThan(slowDense.harmonicCount);
      
      // Fast tenuous should be brighter (higher filter frequency)
      expect(fastTenuous.filterFrequency).toBeGreaterThan(slowDense.filterFrequency);
    });

    it('should represent temperature-velocity correlation', () => {
      const hotFast = mapSpaceWeatherToAudio(createTestData({
        velocity: 600,
        temperature: 150000
      }));
      
      const coldSlow = mapSpaceWeatherToAudio(createTestData({
        velocity: 300,
        temperature: 20000
      }));
      
      // Hot/fast should be brighter and higher pitch
      expect(hotFast.frequency).toBeGreaterThan(coldSlow.frequency);
      expect(hotFast.shimmerGain).toBeGreaterThan(coldSlow.shimmerGain);
      expect(hotFast.filterFrequency).toBeGreaterThan(coldSlow.filterFrequency);
    });

    it('should create distinct sonic signatures for different solar wind regimes', () => {
      // Coronal Hole High Speed Stream (CH HSS)
      const chHss = mapSpaceWeatherToAudio(createTestData({
        velocity: 650,
        density: 3,
        temperature: 80000,
        bz: -5
      }));
      
      // Slow, dense stream
      const slowStream = mapSpaceWeatherToAudio(createTestData({
        velocity: 320,
        density: 25,
        temperature: 30000,
        bz: 3
      }));
      
      // They should sound quite different
      expect(Math.abs(chHss.frequency - slowStream.frequency)).toBeGreaterThan(100); // Different pitch
      expect(Math.abs(chHss.harmonicCount - slowStream.harmonicCount)).toBeGreaterThan(2); // Different richness
      expect(chHss.stereoSpread).not.toBe(slowStream.stereoSpread); // Different spatialization
    });
  });
});

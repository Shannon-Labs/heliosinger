# Heliosinger Scientific & Musical Logic Review Prompt

## Context

Heliosinger is a real-time sonification system that transforms live space weather data from NOAA/NASA satellites into musical audio. The sun "sings" space weather conditions using vowel formant synthesis, harmonic series-based chord voicing, and spatial audio effects.

## Review Task

Please review the scientific validity and musical logic of the space weather parameter mappings in the Heliosinger system. Focus on:

1. **Scientific Accuracy**: Are the physical relationships and derived metrics calculated correctly?
2. **Mapping Validity**: Do the space weather → audio parameter mappings make physical/scientific sense?
3. **Musical Logic**: Are the audio transformations musically coherent and perceptually meaningful?
4. **Edge Cases**: Are extreme values and missing data handled appropriately?

## Implementation Overview

The system maps space weather parameters to audio using the following layers:

### Foundation Layer
- **Solar wind velocity** (200-800 km/s) → **Pitch** (pentatonic scale, C2-C6)
- Uses pentatonic intervals for musical coherence

### Derived Metrics Computed

The system calculates these derived metrics from basic solar wind parameters:

```typescript
// Dynamic pressure: Pdyn = 1.6726e-6 * n * v² (nPa)
// where n = density (cm⁻³), v = velocity (km/s)

// IMF clock angle: θc = atan2(By, Bz) (radians)
// Total magnetic field: BT = sqrt(Bx² + By² + Bz²) (nT)

// Interplanetary electric field: Ey = -Vsw * Bz (mV/m, GSM)
// where Vsw = solar wind velocity (km/s), Bz = z-component (nT)

// Alfvén speed: Va = 21.8 * BT / sqrt(n) (km/s)
// where BT = total field (nT), n = density (cm⁻³)

// Alfvén Mach number: MA = Vsw / Va (dimensionless)

// Plasma beta: β ≈ 4.03e-6 * n * T / BT² (dimensionless)
// where n = density (cm⁻³), T = temperature (K), BT = total field (nT)
```

### Space Weather → Audio Mappings

#### 1. X-ray Flux (GOES XRS)
- **Input**: `xray_flux.short_wave` (W/m², typical range: 1e-8 to 1e-3)
- **Mapping**: 
  - Values >70% of range → filter brightness boost (0-0.09)
  - Spike detection (2x+ increase) → additional transient boost (0-0.15)
  - Applied as frequency multiplier: `finalFrequency *= (1 + xrayBoost)`
- **Rationale**: Solar flares produce X-ray bursts → brighten audio

#### 2. Proton Flux (GOES)
- **Input**: `proton_flux.flux_10mev` (pfu, typical range: 1 to 1e5)
- **Mappings**:
  - **Rumble gain**: `normalizedProton * 0.5` (sub-bass layer, 0-0.5)
  - **Reverb density**: `reverbRoomSize += normalizedProton * 0.3` (denser "air")
- **Rationale**: Radiation storms → low-frequency weight and atmospheric density

#### 3. Electron Flux (GOES)
- **Input**: `electron_flux.flux_2mev` (typical range: 1e3 to 1e6)
- **Mapping**: `shimmerGain = max(shimmerGain, normalizedElectron * 0.4)`
- **Rationale**: High-energy electrons → high-frequency shimmer/air

#### 4. Magnetometer (Boulder H-component)
- **Input**: `magnetometer.h_component` (nT, typical range: -200 to 200)
- **Mappings**:
  - Absolute H magnitude → slower pulses when high
  - dH/dt (rate of change) → tremolo depth increase (LF "thuds" on sharp changes)
- **Rationale**: Geomagnetic disturbances → rhythmic modulation

#### 5. Dynamic Pressure (Pdyn)
- **Computed**: `Pdyn = 1.6726e-6 * n * v²` (nPa)
- **Mappings**:
  - High Pdyn → reduce delay feedback (transient "kick")
  - Shock detection (1.5x+ increase) → additional feedback reduction
- **Rationale**: Pressure shocks → percussive effects

#### 6. IMF Clock Angle (θc)
- **Computed**: `θc = atan2(By, Bz)` (radians)
- **Mapping**: `stereoSpread = 0.5 + sin(θc) * 0.3 * rotationSpeed`
- **Rationale**: IMF orientation → spatial audio rotation

#### 7. Total Magnetic Field (BT)
- **Computed**: `BT = sqrt(Bx² + By² + Bz²)` (nT)
- **Mapping**: Increases vibrato depth: `vibratoDepth *= (1 + normalizedBT * 0.5)`
- **Rationale**: Stronger field → more modulation

#### 8. Interplanetary Electric Field (Ey)
- **Computed**: `Ey = -Vsw * Bz * 1e-3` (mV/m)
- **Mapping**: Increases vibrato rate: `vibratoRate *= (1 + normalizedEy * 0.4)`
- **Rationale**: Higher Ey → more "urgency" and agitation

#### 9. Alfvén Mach Number (MA)
- **Computed**: `MA = Vsw / Va` where `Va = 21.8 * BT / sqrt(n)`
- **Mappings**:
  - Increases harmonic count cap: `harmonicCount += floor(normalizedMA * 4)`
  - Increases vibrato depth: `vibratoDepth *= (1 + normalizedMA * 0.3)`
  - Increases vibrato rate: `vibratoRate *= (1 + normalizedMA * 0.2)`
- **Rationale**: Super-Alfvénic flow → more energetic texture

#### 10. Plasma Beta (β)
- **Computed**: `β ≈ 4.03e-6 * n * T / BT²`
- **Mappings**:
  - High β → brighter filter (higher frequency): `baseFrequency *= (1 + normalizedBeta * 0.2)`
  - High β → more open filter (lower Q): `q *= (1 - normalizedBeta * 0.3)`
- **Rationale**: High β (pressure-dominated) → brighter, breathier timbre

## Key Questions for Review

### Scientific Validity

1. **Derived Metrics Formulas**:
   - Are the formulas for Pdyn, Va, MA, and β correct?
   - Are the units and conversion factors (e.g., 1.6726e-6, 21.8, 4.03e-6) accurate?
   - Is the Ey calculation correct? (Note: Ey = -Vsw × Bz in GSM coordinates)

2. **Parameter Ranges**:
   - Are the typical ranges for each parameter realistic?
   - X-ray flux: 1e-8 to 1e-3 W/m²
   - Proton flux: 1 to 1e5 pfu (10 MeV)
   - Electron flux: 1e3 to 1e6 (2 MeV)
   - Magnetometer H: -200 to 200 nT
   - Dynamic pressure: 0.5 to 20 nPa

3. **Physical Relationships**:
   - Does X-ray flux → brightness make physical sense?
   - Does proton flux → low-frequency weight make sense?
   - Does electron flux → high-frequency shimmer make sense?
   - Does magnetometer dH/dt → tremolo pulses make sense?
   - Does dynamic pressure → percussive effects make sense?
   - Does clock angle → spatial rotation make sense?
   - Does electric field → modulation intensity make sense?
   - Does Mach number → harmonic richness make sense?
   - Does plasma beta → filter brightness make sense?

### Musical Logic

1. **Mapping Coherence**:
   - Are the audio transformations perceptually meaningful?
   - Do the mappings create musically coherent results?
   - Are the parameter ranges (0-1 normalization) appropriate?

2. **Musical Scales**:
   - Is pentatonic scale appropriate for velocity → pitch mapping?
   - Are the harmonic series-based chord voicings musically valid?

3. **Audio Effects**:
   - Do the reverb/delay mappings create atmospheric effects?
   - Are the vibrato/tremolo modulations musically expressive?
   - Do the filter and texture layers add meaningful color?

4. **Transient Events**:
   - Are spike detection thresholds (2x for X-ray, 1.5x for Pdyn) appropriate?
   - Do transient effects create perceptible musical events?

### Edge Cases & Robustness

1. **Missing Data**: How are undefined/null values handled?
2. **Extreme Values**: Are values clamped appropriately?
3. **Division by Zero**: Are cases like `density = 0` or `BT = 0` handled?
4. **NaN/Infinity**: Are mathematical edge cases prevented?

## Code Reference

The main implementation is in `client/src/lib/heliosinger-mapping.ts`. Key functions:

- `calculateDerivedMetrics()` - Lines 294-337
- `calculateFilterParameters()` - Lines 563-643 (includes xray, electron, beta)
- `calculateReverbDelay()` - Lines 882-959 (includes proton, Pdyn)
- `calculateRumbleGain()` - Lines 965-983 (proton flux)
- `calculateRhythmicParameters()` - Lines 342-391 (magnetometer)
- `calculateSpatialParameters()` - Lines 352-429 (clock angle, BT, MA, Ey)
- `calculateHarmonicContent()` - Lines 234-287 (MA enhancement)

## Review Output Format

Please provide:

1. **Scientific Accuracy Assessment**: 
   - Correct any formula errors
   - Validate unit conversions
   - Verify parameter ranges
   - Flag any physically incorrect mappings

2. **Musical Logic Assessment**:
   - Evaluate mapping coherence
   - Suggest improvements for musical expressivity
   - Validate audio parameter ranges

3. **Edge Case Analysis**:
   - Identify potential bugs or failures
   - Suggest robustness improvements

4. **Overall Recommendation**:
   - Is the implementation scientifically sound?
   - Are the mappings musically meaningful?
   - What improvements would you suggest?

## Additional Context

- The system uses Web Audio API for real-time synthesis
- Audio updates occur every 1-60 seconds (adaptive based on space weather activity)
- The system is designed for both scientific accuracy and musical expressivity
- Target audience: space weather enthusiasts, scientists, and general public

Thank you for your thorough review!


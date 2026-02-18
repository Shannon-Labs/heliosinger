export type SpaceWeatherCondition =
  | "quiet"
  | "moderate"
  | "storm"
  | "extreme"
  | "super_extreme";

export interface KIndexData {
  timestamp: string;
  kp: number;
  a_running: number;
  station_count?: number;
  history?: Array<{ timestamp: string; kp: number; a_running: number }>;
}

export interface XrayFluxData {
  timestamp: string;
  short_wave?: number;
  long_wave?: number;
  flare_class?: string;
  begin?: string;
  current?: string;
  end?: string;
  max_flux?: string;
  note?: string;
}

export interface ProtonFluxData {
  timestamp: string;
  flux_10mev: number;
  flux_50mev: number;
  flux_100mev: number;
  note?: string;
}

export interface ElectronFluxData {
  timestamp: string;
  flux_2mev: number;
  flux_0_8mev: number;
  note?: string;
}

export interface MagnetometerData {
  timestamp: string;
  h_component: number;
  d_component: number;
  z_component: number;
  note?: string;
}

export interface ComprehensiveSpaceWeatherData {
  timestamp: string;
  solar_wind: {
    timestamp: string;
    velocity: number;
    density: number;
    bz: number;
    bx?: number;
    by?: number;
    bt?: number;
    temperature: number;
  } | null;
  k_index: KIndexData | null;
  xray_flux: XrayFluxData | null;
  proton_flux: ProtonFluxData | null;
  electron_flux: ElectronFluxData | null;
  magnetometer: MagnetometerData | null;
}

export interface ChordData {
  baseNote: string;
  frequency: number;
  midiNote: number;
  decayTime: number;
  detuneCents: number;
  condition: SpaceWeatherCondition;
  density: number;
  kIndex?: number;
  xrayFlux?: number;
  protonFlux?: number;
  electronFlux?: number;
  magnetometerH?: number;
}

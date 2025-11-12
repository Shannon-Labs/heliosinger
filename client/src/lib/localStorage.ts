// Client-side storage utilities for static site
const AMBIENT_SETTINGS_KEY = 'solar-wind-chime-ambient-settings';

export interface AmbientSettingsStorage {
  enabled: string;
  intensity: number;
  volume: number;
  respect_night: string;
  day_only: string;
  smoothing: number;
  max_rate: number;
  battery_min: number;
  gentle_mode?: string; // "true" or "false" for gentler descriptions
  background_mode?: string; // "true" or "false" for background ambient mode
}

export function getAmbientSettings(): AmbientSettingsStorage | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(AMBIENT_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load ambient settings from localStorage:', error);
  }
  
  return null;
}

export function saveAmbientSettings(settings: Partial<AmbientSettingsStorage>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getAmbientSettings() || {
      enabled: "false",
      intensity: 0.5,
      volume: 0.3,
      respect_night: "true",
      day_only: "false",
      smoothing: 0.8,
      max_rate: 10.0,
      battery_min: 20.0
    };
    
    const updated = { ...existing, ...settings };
    localStorage.setItem(AMBIENT_SETTINGS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save ambient settings to localStorage:', error);
  }
}


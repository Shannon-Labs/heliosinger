import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Solar Wind Data from NOAA DSCOVR
export const solarWindReadings = pgTable("solar_wind_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  velocity: real("velocity").notNull(), // km/s
  density: real("density").notNull(), // particles/cm³
  bz: real("bz").notNull(), // nT (GSM coordinate system)
  bt: real("bt"), // nT (total magnetic field)
  temperature: real("temperature"), // K
  raw_data: jsonb("raw_data"), // Store full NOAA response
});

// MIDI/Audio Mapping Configuration
export const mappingConfigs = pgTable("mapping_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  velocity_min: real("velocity_min").notNull().default(200), // km/s
  velocity_max: real("velocity_max").notNull().default(800), // km/s
  midi_note_min: integer("midi_note_min").notNull().default(36), // C2
  midi_note_max: integer("midi_note_max").notNull().default(84), // C6
  density_min: real("density_min").notNull().default(0.5), // p/cm³
  density_max: real("density_max").notNull().default(50.0), // p/cm³
  decay_time_min: real("decay_time_min").notNull().default(0.2), // seconds
  decay_time_max: real("decay_time_max").notNull().default(5.0), // seconds
  bz_detune_cents: integer("bz_detune_cents").notNull().default(-20), // cents
  bz_threshold: real("bz_threshold").notNull().default(-5.0), // nT
  created_at: timestamp("created_at").notNull().defaultNow(),
  is_active: text("is_active").notNull().default("true"),
});

// System Status and Monitoring
export const systemStatus = pgTable("system_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  component: text("component").notNull(), // 'network', 'data_stream', 'power', 'chimes'
  status: text("status").notNull(), // 'active', 'inactive', 'error'
  details: text("details"),
  last_update: timestamp("last_update").notNull().defaultNow(),
});

// Ambient Mode Settings
export const ambientSettings = pgTable("ambient_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enabled: text("enabled").notNull().default("false"), // boolean as string
  intensity: real("intensity").notNull().default(0.5), // 0.0 - 1.0, controls strike rate
  volume: real("volume").notNull().default(0.3), // 0.0 - 1.0, ambient audio volume
  respect_night: text("respect_night").notNull().default("true"), // respect night mode
  day_only: text("day_only").notNull().default("false"), // only play during day
  smoothing: real("smoothing").notNull().default(0.8), // 0.0 - 1.0, parameter smoothing
  max_rate: real("max_rate").notNull().default(10.0), // max strikes per minute
  battery_min: real("battery_min").notNull().default(20.0), // min battery % to enable
  last_update: timestamp("last_update").notNull().defaultNow(),
});

// Create insert schemas
export const insertSolarWindReadingSchema = createInsertSchema(solarWindReadings).omit({
  id: true,
  timestamp: true,
});

export const insertMappingConfigSchema = createInsertSchema(mappingConfigs).omit({
  id: true,
  created_at: true,
});

export const insertSystemStatusSchema = createInsertSchema(systemStatus).omit({
  id: true,
  last_update: true,
});

export const insertAmbientSettingsSchema = createInsertSchema(ambientSettings).omit({
  id: true,
  last_update: true,
});

// Types
export type SolarWindReading = typeof solarWindReadings.$inferSelect;
export type InsertSolarWindReading = z.infer<typeof insertSolarWindReadingSchema>;

export type MappingConfig = typeof mappingConfigs.$inferSelect;
export type InsertMappingConfig = z.infer<typeof insertMappingConfigSchema>;

export type SystemStatus = typeof systemStatus.$inferSelect;
export type InsertSystemStatus = z.infer<typeof insertSystemStatusSchema>;

export type AmbientSettings = typeof ambientSettings.$inferSelect;
export type InsertAmbientSettings = z.infer<typeof insertAmbientSettingsSchema>;

// Space weather condition types
export type SpaceWeatherCondition = 'quiet' | 'moderate' | 'storm' | 'extreme';

// Space Weather Data Types
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

// Chord data structure (expanded for multi-parameter audio)
export interface ChordData {
  baseNote: string;
  frequency: number;
  midiNote: number;
  decayTime: number;
  detuneCents: number;
  condition: SpaceWeatherCondition;
  density: number; // Solar wind particle density (p/cm³)
  // New parameters for multi-layer audio
  kIndex?: number; // For rhythm/tempo
  xrayFlux?: number; // For brightness/volume bursts
  protonFlux?: number; // For harmonic richness
  electronFlux?: number; // For high-frequency content
  magnetometerH?: number; // For low-frequency rumble
}

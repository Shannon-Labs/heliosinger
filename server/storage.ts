import { 
  type SolarWindReading, 
  type InsertSolarWindReading,
  type MappingConfig,
  type InsertMappingConfig,
  type HardwareConfig,
  type InsertHardwareConfig,
  type SystemStatus,
  type InsertSystemStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Solar Wind Data
  getSolarWindReadings(limit?: number): Promise<SolarWindReading[]>;
  getLatestSolarWindReading(): Promise<SolarWindReading | undefined>;
  createSolarWindReading(reading: InsertSolarWindReading): Promise<SolarWindReading>;

  // Mapping Configuration
  getMappingConfigs(): Promise<MappingConfig[]>;
  getActiveMappingConfig(): Promise<MappingConfig | undefined>;
  createMappingConfig(config: InsertMappingConfig): Promise<MappingConfig>;
  updateMappingConfig(id: string, config: Partial<MappingConfig>): Promise<MappingConfig | undefined>;

  // Hardware Configuration
  getHardwareConfigs(): Promise<HardwareConfig[]>;
  getHardwareConfig(id: string): Promise<HardwareConfig | undefined>;
  createHardwareConfig(config: InsertHardwareConfig): Promise<HardwareConfig>;
  updateHardwareConfig(id: string, config: Partial<HardwareConfig>): Promise<HardwareConfig | undefined>;

  // System Status
  getSystemStatus(): Promise<SystemStatus[]>;
  updateSystemStatus(status: InsertSystemStatus): Promise<SystemStatus>;
}

export class MemStorage implements IStorage {
  private solarWindReadings: Map<string, SolarWindReading>;
  private mappingConfigs: Map<string, MappingConfig>;
  private hardwareConfigs: Map<string, HardwareConfig>;
  private systemStatuses: Map<string, SystemStatus>;

  constructor() {
    this.solarWindReadings = new Map();
    this.mappingConfigs = new Map();
    this.hardwareConfigs = new Map();
    this.systemStatuses = new Map();
    
    // Initialize with default configurations
    this.initializeDefaults();
  }

  private initializeDefaults() {
    // Default mapping configuration
    const defaultMapping: MappingConfig = {
      id: randomUUID(),
      name: "Default Solar Wind Mapping",
      velocity_min: 200,
      velocity_max: 800,
      midi_note_min: 36,
      midi_note_max: 84,
      density_min: 0.5,
      density_max: 50.0,
      decay_time_min: 0.2,
      decay_time_max: 5.0,
      bz_detune_cents: -20,
      bz_threshold: -5.0,
      created_at: new Date(),
      is_active: "true"
    };
    this.mappingConfigs.set(defaultMapping.id, defaultMapping);

    // Default hardware configuration
    const defaultHardware: HardwareConfig = {
      id: randomUUID(),
      device_name: "Solar Wind Chime ESP32",
      pin_velocity: 2,
      pin_density: 4,
      pin_bz: 5,
      pin_status_led: 18,
      pin_sda: 21,
      pin_scl: 22,
      wifi_ssid: null,
      update_interval: 60,
      firmware_version: "1.0.0",
      created_at: new Date()
    };
    this.hardwareConfigs.set(defaultHardware.id, defaultHardware);

    // Initialize system status
    const statusComponents = ['network', 'data_stream', 'power', 'chimes'];
    statusComponents.forEach(component => {
      const status: SystemStatus = {
        id: randomUUID(),
        component,
        status: 'active',
        details: 'System initialized',
        last_update: new Date()
      };
      this.systemStatuses.set(component, status);
    });
  }

  // Solar Wind Data methods
  async getSolarWindReadings(limit = 100): Promise<SolarWindReading[]> {
    const readings = Array.from(this.solarWindReadings.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    return readings;
  }

  async getLatestSolarWindReading(): Promise<SolarWindReading | undefined> {
    const readings = await this.getSolarWindReadings(1);
    return readings[0];
  }

  async createSolarWindReading(insertReading: InsertSolarWindReading): Promise<SolarWindReading> {
    const id = randomUUID();
    const reading: SolarWindReading = {
      ...insertReading,
      id,
      timestamp: new Date(),
      bt: insertReading.bt ?? null,
      temperature: insertReading.temperature ?? null
    };
    this.solarWindReadings.set(id, reading);
    return reading;
  }

  // Mapping Configuration methods
  async getMappingConfigs(): Promise<MappingConfig[]> {
    return Array.from(this.mappingConfigs.values());
  }

  async getActiveMappingConfig(): Promise<MappingConfig | undefined> {
    return Array.from(this.mappingConfigs.values()).find(config => config.is_active === "true");
  }

  async createMappingConfig(insertConfig: InsertMappingConfig): Promise<MappingConfig> {
    const id = randomUUID();
    const config: MappingConfig = {
      name: insertConfig.name,
      velocity_min: insertConfig.velocity_min ?? 200,
      velocity_max: insertConfig.velocity_max ?? 800,
      midi_note_min: insertConfig.midi_note_min ?? 36,
      midi_note_max: insertConfig.midi_note_max ?? 84,
      density_min: insertConfig.density_min ?? 0.5,
      density_max: insertConfig.density_max ?? 50.0,
      decay_time_min: insertConfig.decay_time_min ?? 0.2,
      decay_time_max: insertConfig.decay_time_max ?? 5.0,
      bz_detune_cents: insertConfig.bz_detune_cents ?? -20,
      bz_threshold: insertConfig.bz_threshold ?? -5.0,
      is_active: insertConfig.is_active ?? "true",
      id,
      created_at: new Date()
    };
    this.mappingConfigs.set(id, config);
    return config;
  }

  async updateMappingConfig(id: string, updates: Partial<MappingConfig>): Promise<MappingConfig | undefined> {
    const existing = this.mappingConfigs.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.mappingConfigs.set(id, updated);
    return updated;
  }

  // Hardware Configuration methods
  async getHardwareConfigs(): Promise<HardwareConfig[]> {
    return Array.from(this.hardwareConfigs.values());
  }

  async getHardwareConfig(id: string): Promise<HardwareConfig | undefined> {
    return this.hardwareConfigs.get(id);
  }

  async createHardwareConfig(insertConfig: InsertHardwareConfig): Promise<HardwareConfig> {
    const id = randomUUID();
    const config: HardwareConfig = {
      device_name: insertConfig.device_name,
      pin_velocity: insertConfig.pin_velocity ?? 2,
      pin_density: insertConfig.pin_density ?? 4,
      pin_bz: insertConfig.pin_bz ?? 5,
      pin_status_led: insertConfig.pin_status_led ?? 18,
      pin_sda: insertConfig.pin_sda ?? 21,
      pin_scl: insertConfig.pin_scl ?? 22,
      wifi_ssid: insertConfig.wifi_ssid ?? null,
      update_interval: insertConfig.update_interval ?? 60,
      firmware_version: insertConfig.firmware_version ?? "1.0.0",
      id,
      created_at: new Date()
    };
    this.hardwareConfigs.set(id, config);
    return config;
  }

  async updateHardwareConfig(id: string, updates: Partial<HardwareConfig>): Promise<HardwareConfig | undefined> {
    const existing = this.hardwareConfigs.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.hardwareConfigs.set(id, updated);
    return updated;
  }

  // System Status methods
  async getSystemStatus(): Promise<SystemStatus[]> {
    return Array.from(this.systemStatuses.values());
  }

  async updateSystemStatus(insertStatus: InsertSystemStatus): Promise<SystemStatus> {
    const existing = this.systemStatuses.get(insertStatus.component);
    const id = existing?.id || randomUUID();
    
    const status: SystemStatus = {
      component: insertStatus.component,
      status: insertStatus.status,
      details: insertStatus.details ?? null,
      id,
      last_update: new Date()
    };
    
    this.systemStatuses.set(insertStatus.component, status);
    return status;
  }
}

export const storage = new MemStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSolarWindReadingSchema, insertMappingConfigSchema, insertAmbientSettingsSchema } from "@shared/schema";
import {
  buildMappedChordFromStorageConfig,
  getTestConditionInput,
} from "../functions/api/mapping/_shared/chord-mapping";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // NOAA Data Fetching and Solar Wind API
  app.get("/api/solar-wind/current", async (req, res) => {
    try {
      const reading = await storage.getLatestSolarWindReading();
      if (!reading) {
        return res.status(404).json({ message: "No solar wind data available" });
      }
      res.json(reading);
    } catch (error) {
      console.error("Error fetching current solar wind data:", error);
      res.status(500).json({ message: "Failed to fetch solar wind data" });
    }
  });

  app.get("/api/solar-wind/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const readings = await storage.getSolarWindReadings(limit);
      res.json(readings);
    } catch (error) {
      console.error("Error fetching solar wind history:", error);
      res.status(500).json({ message: "Failed to fetch solar wind history" });
    }
  });

  // Fetch real-time data from NOAA DSCOVR
  app.post("/api/solar-wind/fetch", async (req, res) => {
    try {
      // NOAA SWPC real-time plasma data endpoint (updated URL)
      const noaaResponse = await fetch('https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json');
      
      if (!noaaResponse.ok) {
        throw new Error(`NOAA API error: ${noaaResponse.status}`);
      }

      const noaaData = await noaaResponse.json();
      
      // Parse NOAA data format - skip header row, take latest entry
      const dataRows = noaaData.slice(1); // Remove header row
      const latestData = dataRows[dataRows.length - 1];
      
      if (!latestData || latestData.length < 4) {
        throw new Error(`Invalid NOAA data format. Expected array with 4+ elements, got: ${JSON.stringify(latestData)}`);
      }

      // New NOAA format: [time_tag, density, speed, temperature]
      // Note: Bz data needs to be fetched from magnetometer endpoint separately
      const solarWindData = {
        velocity: parseFloat(latestData[2]) || 0, // speed km/s
        density: parseFloat(latestData[1]) || 0, // proton density p/cm³
        bz: 0, // Will fetch from mag endpoint later
        bt: null, // Not available in plasma endpoint
        temperature: parseFloat(latestData[3]) || 0, // temperature K
        raw_data: latestData
      };

      const reading = await storage.createSolarWindReading(solarWindData);
      
      // Update system status
      await storage.updateSystemStatus({
        component: 'data_stream',
        status: 'active',
        details: `Updated: ${new Date().toISOString()}`
      });

      res.json(reading);
    } catch (error) {
      console.error("Error fetching NOAA data:", error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update system status to error
      await storage.updateSystemStatus({
        component: 'data_stream',
        status: 'error',
        details: `NOAA fetch failed: ${errorMessage}`
      });
      
      res.status(500).json({ message: "Failed to fetch NOAA data", error: errorMessage });
    }
  });

  // MIDI Mapping Configuration
  app.get("/api/mapping/configs", async (req, res) => {
    try {
      const configs = await storage.getMappingConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching mapping configs:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ message: "Failed to fetch mapping configurations", error: errorMessage });
    }
  });

  app.get("/api/mapping/active", async (req, res) => {
    try {
      const config = await storage.getActiveMappingConfig();
      if (!config) {
        return res.status(404).json({ message: "No active mapping configuration found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching active mapping config:", error);
      res.status(500).json({ message: "Failed to fetch active mapping configuration" });
    }
  });

  app.post("/api/mapping/configs", async (req, res) => {
    try {
      const validatedData = insertMappingConfigSchema.parse(req.body);
      const config = await storage.createMappingConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating mapping config:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Invalid mapping configuration data", error: errorMessage });
    }
  });

  app.patch("/api/mapping/configs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const config = await storage.updateMappingConfig(id, updates);
      
      if (!config) {
        return res.status(404).json({ message: "Mapping configuration not found" });
      }
      
      res.json(config);
    } catch (error) {
      console.error("Error updating mapping config:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Failed to update mapping configuration", error: errorMessage });
    }
  });

  // Solar Wind to MIDI/Chord Mapping
  app.post("/api/mapping/calculate-chord", async (req, res) => {
    try {
      const { velocity, density, bz } = req.body;
      
      if (typeof velocity !== 'number' || typeof density !== 'number' || typeof bz !== 'number') {
        return res.status(400).json({ message: "Invalid input parameters" });
      }

      const mappingConfig = await storage.getActiveMappingConfig();
      if (!mappingConfig) {
        return res.status(404).json({ message: "No active mapping configuration" });
      }

      const mappedData = buildMappedChordFromStorageConfig(
        { velocity, density, bz },
        mappingConfig
      );
      res.json(mappedData);
    } catch (error) {
      console.error("Error calculating chord:", error);
      res.status(500).json({ message: "Failed to calculate chord mapping" });
    }
  });

  // Test different space weather conditions
  app.post("/api/mapping/test-condition", async (req, res) => {
    try {
      const { condition } = req.body;

      const testData = getTestConditionInput(condition);
      if (!testData) {
        return res.status(400).json({ message: "Invalid condition. Use 'quiet', 'moderate', or 'storm'" });
      }

      const mappingConfig = await storage.getActiveMappingConfig();
      if (!mappingConfig) {
        return res.status(404).json({ message: "No active mapping configuration" });
      }

      const chordData = buildMappedChordFromStorageConfig(testData, mappingConfig);

      res.json({
        requestedCondition: condition,
        condition: chordData.condition,
        testData,
        chord: chordData,
      });
    } catch (error) {
      console.error("Error testing condition:", error);
      res.status(500).json({ message: "Failed to test space weather condition" });
    }
  });

  // System Status and Monitoring
  app.get("/api/system/status", async (req, res) => {
    try {
      const statuses = await storage.getSystemStatus();
      res.json(statuses);
    } catch (error) {
      console.error("Error fetching system status:", error);
      res.status(500).json({ message: "Failed to fetch system status" });
    }
  });

  app.post("/api/system/test-chimes", async (req, res) => {
    try {
      // Simulate chime testing
      await storage.updateSystemStatus({
        component: 'chimes',
        status: 'testing',
        details: 'Running chime test sequence'
      });

      // Simulate test delay
      setTimeout(async () => {
        await storage.updateSystemStatus({
          component: 'chimes',
          status: 'active',
          details: 'Chime test completed successfully'
        });
      }, 3000);

      res.json({ message: "Chime test sequence initiated" });
    } catch (error) {
      console.error("Error testing chimes:", error);
      res.status(500).json({ message: "Failed to test chimes" });
    }
  });

  // Ambient Mode Settings
  app.get("/api/settings/ambient", async (req, res) => {
    try {
      const settings = await storage.getAmbientSettings();
      if (!settings) {
        // Return default settings if none exist
        return res.json({
          enabled: "false",
          intensity: 0.5,
          volume: 0.3,
          respect_night: "true",
          day_only: "false",
          smoothing: 0.8,
          max_rate: 10.0,
          battery_min: 20.0
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching ambient settings:", error);
      res.status(500).json({ message: "Failed to fetch ambient settings" });
    }
  });

  app.post("/api/settings/ambient", async (req, res) => {
    try {
      const validatedData = insertAmbientSettingsSchema.parse(req.body);
      const settings = await storage.updateAmbientSettings(validatedData);
      
      // Update system status to reflect ambient mode state
      await storage.updateSystemStatus({
        component: 'chimes',
        status: settings.enabled === "true" ? 'ambient' : 'active',
        details: `Ambient mode ${settings.enabled === "true" ? 'enabled' : 'disabled'}: intensity=${settings.intensity}, volume=${settings.volume}`
      });
      
      res.json(settings);
    } catch (error) {
      console.error("Error updating ambient settings:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Invalid ambient settings data", error: errorMessage });
    }
  });

  app.get("/api/mode", async (req, res) => {
    try {
      const ambientSettings = await storage.getAmbientSettings();
      const systemStatus = await storage.getSystemStatus();
      const latestSolarWind = await storage.getLatestSolarWindReading();
      
      res.json({
        ambient: {
          enabled: ambientSettings?.enabled === "true" || false,
          intensity: ambientSettings?.intensity || 0.5,
          volume: ambientSettings?.volume || 0.3
        },
        system: {
          data_stream: systemStatus.find(s => s.component === 'data_stream')?.status || 'unknown',
          chimes: systemStatus.find(s => s.component === 'chimes')?.status || 'unknown',
          power: systemStatus.find(s => s.component === 'power')?.status || 'unknown'
        },
        solar_wind: latestSolarWind ? {
          velocity: latestSolarWind.velocity,
          density: latestSolarWind.density,
          bz: latestSolarWind.bz,
          condition: latestSolarWind.velocity > 600 ? 'storm' : latestSolarWind.velocity > 450 ? 'moderate' : 'quiet'
        } : null
      });
    } catch (error) {
      console.error("Error fetching system mode:", error);
      res.status(500).json({ message: "Failed to fetch system mode" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

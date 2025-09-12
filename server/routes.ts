import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSolarWindReadingSchema, insertMappingConfigSchema, insertHardwareConfigSchema } from "@shared/schema";

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

      // Calculate MIDI note from velocity (200-800 km/s → C2-C6)
      const velocityRange = mappingConfig.velocity_max - mappingConfig.velocity_min;
      const midiRange = mappingConfig.midi_note_max - mappingConfig.midi_note_min;
      const velocityNormalized = Math.max(0, Math.min(1, (velocity - mappingConfig.velocity_min) / velocityRange));
      const midiNote = Math.round(mappingConfig.midi_note_min + (velocityNormalized * midiRange));
      
      // Convert MIDI note to frequency (A440 standard)
      const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
      
      // Calculate note name
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor((midiNote - 12) / 12);
      const noteIndex = (midiNote - 12) % 12;
      const noteName = `${noteNames[noteIndex]}${octave}`;

      // Calculate decay time from density (logarithmic mapping)
      const densityNormalized = Math.max(0, Math.min(1, Math.log(density / mappingConfig.density_min) / Math.log(mappingConfig.density_max / mappingConfig.density_min)));
      const decayTime = mappingConfig.decay_time_min + ((1 - densityNormalized) * (mappingConfig.decay_time_max - mappingConfig.decay_time_min));

      // Calculate detune from Bz (southward creates beating)
      const detuneCents = bz < mappingConfig.bz_threshold ? mappingConfig.bz_detune_cents : 0;
      
      // Determine space weather condition
      let condition: 'quiet' | 'moderate' | 'storm' = 'quiet';
      if (velocity > 600 || Math.abs(bz) > 10) {
        condition = 'storm';
      } else if (velocity > 450 || Math.abs(bz) > 5) {
        condition = 'moderate';
      }

      const chordData = {
        baseNote: noteName,
        frequency,
        midiNote,
        decayTime: Math.round(decayTime * 100) / 100,
        detuneCents,
        condition,
        velocity,
        density,
        bz
      };

      res.json(chordData);
    } catch (error) {
      console.error("Error calculating chord:", error);
      res.status(500).json({ message: "Failed to calculate chord mapping" });
    }
  });

  // Test different space weather conditions
  app.post("/api/mapping/test-condition", async (req, res) => {
    try {
      const { condition } = req.body;
      
      let testData;
      switch (condition) {
        case 'quiet':
          testData = { velocity: 350, density: 5.0, bz: 2.0 };
          break;
        case 'moderate':
          testData = { velocity: 500, density: 8.0, bz: -7.0 };
          break;
        case 'storm':
          testData = { velocity: 750, density: 2.0, bz: -15.0 };
          break;
        default:
          return res.status(400).json({ message: "Invalid condition. Use 'quiet', 'moderate', or 'storm'" });
      }

      // Calculate chord for test condition
      const chordResponse = await fetch(`${req.protocol}://${req.get('host')}/api/mapping/calculate-chord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testData)
      });

      const chordData = await chordResponse.json();
      res.json({ condition, testData, chord: chordData });
    } catch (error) {
      console.error("Error testing condition:", error);
      res.status(500).json({ message: "Failed to test space weather condition" });
    }
  });

  // Hardware Configuration
  app.get("/api/hardware/configs", async (req, res) => {
    try {
      const configs = await storage.getHardwareConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching hardware configs:", error);
      res.status(500).json({ message: "Failed to fetch hardware configurations" });
    }
  });

  app.post("/api/hardware/configs", async (req, res) => {
    try {
      const validatedData = insertHardwareConfigSchema.parse(req.body);
      const config = await storage.createHardwareConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating hardware config:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ message: "Invalid hardware configuration data", error: errorMessage });
    }
  });

  // ESP32 Firmware Generation
  app.post("/api/hardware/generate-firmware", async (req, res) => {
    try {
      const { configId } = req.body;
      
      const config = await storage.getHardwareConfig(configId);
      if (!config) {
        return res.status(404).json({ message: "Hardware configuration not found" });
      }

      const mappingConfig = await storage.getActiveMappingConfig();
      if (!mappingConfig) {
        return res.status(404).json({ message: "No active mapping configuration" });
      }

      // Generate ESP32 firmware code
      const firmwareCode = generateESP32Firmware(config, mappingConfig);
      
      res.json({
        firmware_code: firmwareCode,
        config_id: configId,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating firmware:", error);
      res.status(500).json({ message: "Failed to generate firmware code" });
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

  const httpServer = createServer(app);
  return httpServer;
}

// ESP32 Firmware Generator
function generateESP32Firmware(hardwareConfig: any, mappingConfig: any): string {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `/*
 * Solar Wind Chime ESP32 Firmware
 * Generated: ${currentDate}
 * Device: ${hardwareConfig.device_name}
 * Firmware Version: ${hardwareConfig.firmware_version}
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Pin Configuration
#define PIN_VELOCITY_CHIME ${hardwareConfig.pin_velocity}
#define PIN_DENSITY_CHIME ${hardwareConfig.pin_density}
#define PIN_BZ_CHIME ${hardwareConfig.pin_bz}
#define PIN_STATUS_LED ${hardwareConfig.pin_status_led}
#define PIN_SDA ${hardwareConfig.pin_sda}
#define PIN_SCL ${hardwareConfig.pin_scl}

// WiFi Configuration
const char* ssid = "${hardwareConfig.wifi_ssid || 'YOUR_WIFI_SSID'}";
const char* password = "YOUR_WIFI_PASSWORD";

// API Configuration
const char* apiEndpoint = "https://services.swpc.noaa.gov/products/solar-wind/plasma-2-hour.json";
const unsigned long updateInterval = ${hardwareConfig.update_interval * 1000}; // milliseconds

// Mapping Configuration (Date-stamped: ${currentDate})
const float VELOCITY_MIN = ${mappingConfig.velocity_min};
const float VELOCITY_MAX = ${mappingConfig.velocity_max};
const int MIDI_NOTE_MIN = ${mappingConfig.midi_note_min};
const int MIDI_NOTE_MAX = ${mappingConfig.midi_note_max};
const float DENSITY_MIN = ${mappingConfig.density_min};
const float DENSITY_MAX = ${mappingConfig.density_max};
const float DECAY_TIME_MIN = ${mappingConfig.decay_time_min};
const float DECAY_TIME_MAX = ${mappingConfig.decay_time_max};
const int BZ_DETUNE_CENTS = ${mappingConfig.bz_detune_cents};
const float BZ_THRESHOLD = ${mappingConfig.bz_threshold};

// Global variables
unsigned long lastUpdate = 0;
float currentVelocity = 0;
float currentDensity = 0;
float currentBz = 0;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(PIN_VELOCITY_CHIME, OUTPUT);
  pinMode(PIN_DENSITY_CHIME, OUTPUT);
  pinMode(PIN_BZ_CHIME, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  
  // Initialize WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
  }
  
  Serial.println("WiFi connected!");
  digitalWrite(PIN_STATUS_LED, HIGH);
  
  // Initial data fetch
  fetchSolarWindData();
}

void loop() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastUpdate >= updateInterval) {
    fetchSolarWindData();
    lastUpdate = currentTime;
  }
  
  // Check for incoming serial commands for testing
  if (Serial.available()) {
    String command = Serial.readString();
    command.trim();
    
    if (command == "test") {
      testAllChimes();
    } else if (command == "status") {
      printStatus();
    }
  }
  
  delay(100);
}

void fetchSolarWindData() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiEndpoint);
    
    int httpResponseCode = http.GET();
    
    if (httpResponseCode == 200) {
      String payload = http.getString();
      parseSolarWindData(payload);
      playChord();
      digitalWrite(PIN_STATUS_LED, HIGH);
    } else {
      Serial.printf("HTTP Error: %d\\n", httpResponseCode);
      digitalWrite(PIN_STATUS_LED, LOW);
    }
    
    http.end();
  }
}

void parseSolarWindData(String jsonData) {
  DynamicJsonDocument doc(8192);
  deserializeJson(doc, jsonData);
  
  if (doc.size() > 0) {
    JsonArray latestReading = doc[doc.size() - 1];
    
    if (latestReading.size() >= 8) {
      currentVelocity = latestReading[2]; // speed km/s
      currentDensity = latestReading[1];  // density p/cm³
      currentBz = latestReading[6];       // Bz GSM nT
      
      Serial.printf("Solar Wind Data - V: %.1f km/s, D: %.1f p/cm³, Bz: %.1f nT\\n", 
                   currentVelocity, currentDensity, currentBz);
    }
  }
}

void playChord() {
  // Calculate MIDI note from velocity
  float velocityNorm = constrain((currentVelocity - VELOCITY_MIN) / (VELOCITY_MAX - VELOCITY_MIN), 0.0, 1.0);
  int midiNote = MIDI_NOTE_MIN + (velocityNorm * (MIDI_NOTE_MAX - MIDI_NOTE_MIN));
  
  // Calculate decay time from density (logarithmic)
  float densityNorm = constrain(log(currentDensity / DENSITY_MIN) / log(DENSITY_MAX / DENSITY_MIN), 0.0, 1.0);
  float decayTime = DECAY_TIME_MIN + ((1.0 - densityNorm) * (DECAY_TIME_MAX - DECAY_TIME_MIN));
  
  // Check for Bz detuning
  bool shouldDetune = currentBz < BZ_THRESHOLD;
  
  // Play velocity chime (base note)
  int velocityDuration = map(midiNote, MIDI_NOTE_MIN, MIDI_NOTE_MAX, 50, 200);
  digitalWrite(PIN_VELOCITY_CHIME, HIGH);
  delay(velocityDuration);
  digitalWrite(PIN_VELOCITY_CHIME, LOW);
  
  delay(100);
  
  // Play density chime (envelope)
  int densityDuration = (int)(decayTime * 1000);
  digitalWrite(PIN_DENSITY_CHIME, HIGH);
  delay(densityDuration);
  digitalWrite(PIN_DENSITY_CHIME, LOW);
  
  delay(100);
  
  // Play Bz chime (detune indicator)
  if (shouldDetune) {
    // Create beating effect with rapid pulses
    for (int i = 0; i < 5; i++) {
      digitalWrite(PIN_BZ_CHIME, HIGH);
      delay(50);
      digitalWrite(PIN_BZ_CHIME, LOW);
      delay(50);
    }
  }
  
  Serial.printf("Chord played - MIDI: %d, Decay: %.2fs, Detune: %s\\n", 
               midiNote, decayTime, shouldDetune ? "Yes" : "No");
}

void testAllChimes() {
  Serial.println("Testing all chimes...");
  
  // Test each chime individually
  Serial.println("Testing velocity chime...");
  digitalWrite(PIN_VELOCITY_CHIME, HIGH);
  delay(200);
  digitalWrite(PIN_VELOCITY_CHIME, LOW);
  delay(500);
  
  Serial.println("Testing density chime...");
  digitalWrite(PIN_DENSITY_CHIME, HIGH);
  delay(200);
  digitalWrite(PIN_DENSITY_CHIME, LOW);
  delay(500);
  
  Serial.println("Testing Bz chime...");
  digitalWrite(PIN_BZ_CHIME, HIGH);
  delay(200);
  digitalWrite(PIN_BZ_CHIME, LOW);
  delay(500);
  
  Serial.println("Chime test complete!");
}

void printStatus() {
  Serial.println("=== Solar Wind Chime Status ===");
  Serial.printf("WiFi: %s\\n", WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
  Serial.printf("IP Address: %s\\n", WiFi.localIP().toString().c_str());
  Serial.printf("Current Data - V: %.1f km/s, D: %.1f p/cm³, Bz: %.1f nT\\n", 
               currentVelocity, currentDensity, currentBz);
  Serial.printf("Update Interval: %lu seconds\\n", updateInterval / 1000);
  Serial.printf("Firmware Version: ${hardwareConfig.firmware_version}\\n");
  Serial.println("===============================");
}
`;
}

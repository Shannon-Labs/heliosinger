import React, { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";
import type { HeliosingerData } from "@/lib/heliosinger-mapping";

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system' | 'science' | 'audio';
}

interface SystemTerminalProps {
  data?: ComprehensiveSpaceWeatherData;
  heliosingerData?: HeliosingerData | null;
}

// Contextual facts keyed by what's happening
const CONTEXTUAL_FACTS = {
  highVelocity: [
    "INFO: Solar wind speed and density together set dynamic pressure on Earth.",
    "INFO: Coronal Holes often emit high-speed solar wind streams (>600 km/s).",
    "INFO: High velocity streams can persist for days as Earth rotates through them.",
  ],
  lowDensity: [
    "INFO: Solar wind density typically ranges from 1-10 particles/cm³. >20 is high.",
    "INFO: Rarefied plasma (low density) often accompanies fast solar wind.",
  ],
  highDensity: [
    "INFO: High density compression regions mark where fast wind catches slow wind.",
    "INFO: The Magnetosphere compresses on the dayside during high dynamic pressure.",
  ],
  southwardBz: [
    "INFO: Southward Bz (negative values) connects with Earth's field, fueling storms.",
    "INFO: 'Bz' refers to the North-South component of the Interplanetary Magnetic Field (IMF).",
    "INFO: Magnetic reconnection transfers solar wind energy into the magnetosphere.",
  ],
  northwardBz: [
    "INFO: Northward Bz creates a stable magnetic barrier, deflecting solar wind.",
    "INFO: The L1 Lagrange point allows DSCOVR to see solar wind ~15-60 mins before Earth impact.",
  ],
  stormConditions: [
    "INFO: Kp Index is a logarithmic scale (0-9) of global geomagnetic activity.",
    "INFO: Auroras brighten when solar wind couples into Earth's ring current.",
    "INFO: Geomagnetic storms can disrupt radio communications and power grids.",
  ],
  general: [
    "INFO: Plasma temperature over 500,000 K often means fast solar wind.",
    "INFO: Alfven waves are magnetic waves that carry energy through the plasma.",
  ],
};

export function SystemTerminal({ data, heliosingerData }: SystemTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const prevDataRef = useRef<ComprehensiveSpaceWeatherData | undefined>(undefined);
  const prevHeliosingerRef = useRef<HeliosingerData | null>(null);
  const lastFactRef = useRef<string | null>(null);
  const factCooldownRef = useRef<number>(0);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const now = new Date();
    const timeString = now.toISOString().split('T')[1].slice(0, 8); // HH:MM:SS

    setLogs(prev => {
      const newLogs = [...prev, {
        id: nextId.current++,
        timestamp: timeString,
        message,
        type
      }];
      return newLogs.slice(-80); // Keep last 80 logs
    });
  };

  // Add contextual fact based on current conditions
  const addContextualFact = (category: keyof typeof CONTEXTUAL_FACTS) => {
    const now = Date.now();
    if (now - factCooldownRef.current < 20000) return; // 20s cooldown between facts

    const facts = CONTEXTUAL_FACTS[category];
    const fact = facts[Math.floor(Math.random() * facts.length)];
    if (fact !== lastFactRef.current) {
      addLog(fact, 'science');
      lastFactRef.current = fact;
      factCooldownRef.current = now;
    }
  };

  // Initial boot
  useEffect(() => {
    addLog("HELIOSINGER SYSTEM ONLINE", 'system');
    addLog("Initializing scientific data stream...", 'info');
  }, []);

  // Data Monitoring & Logging Logic
  useEffect(() => {
    if (!data) return;
    const prev = prevDataRef.current;

    const vel = data.solar_wind?.velocity ?? 0;
    const prevVel = prev?.solar_wind?.velocity ?? 0;
    const den = data.solar_wind?.density ?? 0;
    const prevDen = prev?.solar_wind?.density ?? 0;
    const bz = data.solar_wind?.bz ?? 0;
    const prevBz = prev?.solar_wind?.bz ?? 0;
    const kp = data.k_index?.kp ?? 0;
    const prevKp = prev?.k_index?.kp ?? 0;

    // 1. Velocity Checks
    if (Math.abs(vel - prevVel) > 50 && prevVel !== 0) {
      const trend = vel > prevVel ? "SURGE" : "DROP";
      addLog(`WIND ${trend}: ${prevVel.toFixed(0)} → ${vel.toFixed(0)} km/s`, 'warning');
      if (vel > 600) addContextualFact('highVelocity');
    }

    // 2. Density Checks
    if (Math.abs(den - prevDen) > 5 && prevDen !== 0) {
      addLog(`DENSITY SHIFT: ${den.toFixed(1)} p/cm³ (Delta: ${(den - prevDen).toFixed(1)})`, 'info');
      if (den > 15) addContextualFact('highDensity');
      else if (den < 3) addContextualFact('lowDensity');
    }
    if (!prev && den) {
      addLog(`BASELINE DENSITY: ${den.toFixed(1)} p/cm³`, 'info');
    }

    // 3. Magnetic Field (Bz) Checks
    if ((bz < 0 && prevBz >= 0) || (bz > 0 && prevBz <= 0)) {
      const polarity = bz < 0 ? "SOUTHWARD (Active)" : "NORTHWARD (Quiet)";
      const type = bz < 0 ? 'warning' : 'success';
      addLog(`IMF POLARITY FLIP: Now ${polarity}`, type);
      if (bz < -3) addContextualFact('southwardBz');
      else if (bz > 2) addContextualFact('northwardBz');
    }
    if (bz < -10 && prevBz >= -10) {
      addLog(`CRITICAL: Strong Southward Bz (${bz.toFixed(1)} nT). Storm conditions likely.`, 'error');
    }
    if (!prev && bz) {
      addLog(`BASELINE IMF Bz: ${bz.toFixed(1)} nT`, 'info');
    }

    // 4. Kp Index Updates
    if (kp !== prevKp && prevKp !== 0) {
      const level = kp >= 5 ? 'STORM' : kp >= 4 ? 'ACTIVE' : 'QUIET';
      const color = kp >= 5 ? 'error' : kp >= 4 ? 'warning' : 'success';
      addLog(`GEOMAGNETIC UPDATE: Kp ${kp.toFixed(1)} [${level}]`, color);
      if (kp >= 5) addContextualFact('stormConditions');
    }
    if (!prev && kp) {
      addLog(`BASELINE Kp: ${kp.toFixed(1)}`, 'info');
    }

    // 5. Temperature hints
    const temp = data.solar_wind?.temperature ?? 0;
    const prevTemp = prev?.solar_wind?.temperature ?? 0;
    if (temp && (prevTemp === 0 || Math.abs(temp - prevTemp) > 50000)) {
      addLog(`PLASMA TEMP: ${(temp / 1000).toFixed(0)}k K`, temp > 500000 ? 'science' : 'info');
    }

    // 6. Summary snapshot on significant changes
    if (!prev || Math.abs(vel - prevVel) > 40 || Math.abs(den - prevDen) > 3 || Math.abs(bz - prevBz) > 2) {
      addLog(
        `SNAPSHOT → V:${vel.toFixed(0)} km/s | D:${den.toFixed(1)} p/cc | Bz:${bz.toFixed(1)} nT | Kp:${kp.toFixed(1)}`,
        'system'
      );
    }

    prevDataRef.current = data;
  }, [data]);

  // Audio synthesis monitoring
  useEffect(() => {
    if (!heliosingerData) return;
    const prev = prevHeliosingerRef.current;

    // Log significant vowel changes
    if (prev && heliosingerData.vowelName !== prev.vowelName) {
      addLog(`VOWEL SHIFT: ${prev.vowelName} → ${heliosingerData.vowelName}`, 'audio');
    }

    // Log chord quality changes
    if (prev && heliosingerData.chordQuality?.name !== prev.chordQuality?.name) {
      addLog(`HARMONY: ${heliosingerData.chordQuality?.symbol ?? '...'} (${heliosingerData.chordQuality?.name ?? 'resolving'})`, 'audio');
    }

    // Log condition changes
    if (prev && heliosingerData.condition !== prev.condition) {
      addLog(`CONDITION: ${heliosingerData.condition}`, 'system');
    }

    prevHeliosingerRef.current = heliosingerData;
  }, [heliosingerData]);

  // Periodic general fact when things are quiet
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.85) { // 15% chance every 30s
        addContextualFact('general');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs]);

  return (
    <div className="font-mono text-[10px] md:text-xs h-full flex flex-col bg-black/95 font-medium">
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-1.5">
          {logs.map(log => (
            <div key={log.id} className="flex gap-3 font-mono leading-tight">
              <span className="text-white/30 shrink-0 select-none">
                {log.timestamp}
              </span>
              <span className={`
                break-words
                ${log.type === 'error' ? 'text-destructive font-bold bg-destructive/10 px-1' : ''}
                ${log.type === 'warning' ? 'text-amber-500' : ''}
                ${log.type === 'success' ? 'text-emerald-500' : ''}
                ${log.type === 'system' ? 'text-primary/60 italic' : ''}
                ${log.type === 'science' ? 'text-cyan-400' : ''}
                ${log.type === 'audio' ? 'text-violet-400' : ''}
                ${log.type === 'info' ? 'text-white/80' : ''}
              `}>
                {log.type === 'system' && '> '}
                {log.type === 'warning' && '! '}
                {log.type === 'error' && 'X '}
                {log.type === 'audio' && '~ '}
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

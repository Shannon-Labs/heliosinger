import React, { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ComprehensiveSpaceWeatherData } from "@shared/schema";

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system' | 'science';
}

interface SystemTerminalProps {
  data?: ComprehensiveSpaceWeatherData;
}

const EDUCATIONAL_FACTS = [
  "INFO: The L1 Lagrange point allows DSCOVR to see solar wind ~15-60 mins before Earth impact.",
  "INFO: 'Bz' refers to the North-South component of the Interplanetary Magnetic Field (IMF).",
  "INFO: Southward Bz (negative values) connects with Earth's field, fueling storms.",
  "INFO: Solar wind density typically ranges from 1-10 particles/cm³. >20 is high.",
  "INFO: Kp Index is a logarithmic scale (0-9) of global geomagnetic activity.",
  "INFO: Coronal Holes often emit high-speed solar wind streams (>600 km/s).",
  "INFO: Alfvén waves are magnetic waves that carry energy through the plasma.",
  "INFO: The Magnetosphere compresses on the dayside during high dynamic pressure.",
];

export function SystemTerminal({ data }: SystemTerminalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  const prevDataRef = useRef<ComprehensiveSpaceWeatherData | undefined>(undefined);

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
      return newLogs.slice(-100); // Keep last 100 logs
    });
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

    // 1. Velocity Checks
    const vel = data.solar_wind?.velocity ?? 0;
    const prevVel = prev?.solar_wind?.velocity ?? 0;
    if (Math.abs(vel - prevVel) > 50 && prevVel !== 0) {
      const trend = vel > prevVel ? "SURGE" : "DROP";
      addLog(`WIND ${trend}: ${prevVel.toFixed(0)} → ${vel.toFixed(0)} km/s`, 'warning');
      if (vel > 600) addLog("High velocity stream detected. Expect enhanced Kp activity.", 'science');
    }

    // 2. Density Checks
    const den = data.solar_wind?.density ?? 0;
    const prevDen = prev?.solar_wind?.density ?? 0;
    if (Math.abs(den - prevDen) > 5 && prevDen !== 0) {
      addLog(`DENSITY SHIFT: ${den.toFixed(1)} p/cm³ (Delta: ${(den - prevDen).toFixed(1)})`, 'info');
      if (den > 20) addLog("High density compression region passing spacecraft.", 'science');
    }

    // 3. Magnetic Field (Bz) Checks - Crucial for storms
    const bz = data.solar_wind?.bz ?? 0;
    const prevBz = prev?.solar_wind?.bz ?? 0;
    // Check for polarity flip (North <-> South)
    if ((bz < 0 && prevBz >= 0) || (bz > 0 && prevBz <= 0)) {
      const polarity = bz < 0 ? "SOUTHWARD (Active)" : "NORTHWARD (Quiet)";
      const type = bz < 0 ? 'warning' : 'success';
      addLog(`IMF POLARITY FLIP: Now ${polarity}`, type);
      if (bz < -5) addLog("Southward IMF allows energy entry into magnetosphere (Reconnection).", 'science');
    }
    // Check for magnitude intensity
    if (bz < -10 && prevBz >= -10) {
      addLog(`CRITICAL: Strong Southward Bz (${bz.toFixed(1)} nT). Storm conditions likely.`, 'error');
    }

    // 4. Kp Index Updates
    const kp = data.k_index?.kp ?? 0;
    const prevKp = prev?.k_index?.kp ?? 0;
    if (kp !== prevKp && prevKp !== 0) {
      const level = kp >= 5 ? 'STORM' : kp >= 4 ? 'ACTIVE' : 'QUIET';
      const color = kp >= 5 ? 'error' : kp >= 4 ? 'warning' : 'success';
      addLog(`GEOMAGNETIC UPDATE: Kp ${kp.toFixed(1)} [${level}]`, color);
    }

    // 5. X-Ray Flux (Flares)
    const flux = data.xray_flux?.short_wave ?? 0;
    const prevFlux = prev?.xray_flux?.short_wave ?? 0;
    if (flux > 1e-5 && prevFlux <= 1e-5) { // M-class or higher threshold approx
       addLog("SOLAR FLARE DETECTED: High energy photon flux increase.", 'warning');
    }

    prevDataRef.current = data;
  }, [data]);

  // Occasional Educational Loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every 15s
        const fact = EDUCATIONAL_FACTS[Math.floor(Math.random() * EDUCATIONAL_FACTS.length)];
        addLog(fact, 'system');
      }
    }, 15000);
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
                ${log.type === 'error' ? 'text-destructive font-bold' : ''}
                ${log.type === 'warning' ? 'text-amber-500' : ''}
                ${log.type === 'success' ? 'text-emerald-500' : ''}
                ${log.type === 'system' ? 'text-primary/60 italic' : ''}
                ${log.type === 'science' ? 'text-cyan-400' : ''}
                ${log.type === 'info' ? 'text-white/80' : ''}
              `}>
                {log.type === 'system' && '> '}
                {log.message}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

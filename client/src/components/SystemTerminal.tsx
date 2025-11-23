import React, { useEffect, useState, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogEntry {
  id: number;
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'system';
}

const FLAVOR_MESSAGES = [
  "Calibrating formant filters...",
  "Analyzing solar wind density...",
  "Harmonic resonance stable.",
  "Magnetic field vector aligned.",
  "Plasma beta nominal.",
  "Updating sonification parameters...",
  "Receiving DSCOVR telemetry...",
  "Buffering audio stream...",
  "Optimizing vocal tract model...",
  "Scanning for coronal mass ejections...",
  "Solar wind velocity steady.",
  "Adjusting pitch modulation...",
  "Synchronizing with L1 Lagrange point...",
];

export function SystemTerminal() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

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
      return newLogs.slice(-50); // Keep last 50 logs
    });
  };

  // Initial boot sequence
  useEffect(() => {
    addLog("HELIOSINGER SYSTEM INITIALIZED", 'system');
    addLog("Connecting to NOAA data stream...", 'info');
    
    const bootSequence = [
      () => addLog("Audio engine started", 'success'),
      () => addLog("Visualizer subsystem online", 'success'),
      () => addLog("Holographic projection active", 'success'),
    ];

    bootSequence.forEach((fn, i) => setTimeout(fn, (i + 1) * 800));

    // Random flavor text loop
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const msg = FLAVOR_MESSAGES[Math.floor(Math.random() * FLAVOR_MESSAGES.length)];
        addLog(msg, 'system');
      }
    }, 3000);

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
    <div className="font-mono text-xs h-full flex flex-col bg-black border-t-2 border-primary/30">
      <div className="bg-primary/10 px-2 py-1 text-primary font-bold border-b border-primary/30 flex justify-between items-center">
        <span>SYSTEM LOG</span>
        <span className="animate-pulse">●</span>
      </div>
      <ScrollArea className="flex-1 p-2" ref={scrollRef}>
        <div className="space-y-1">
          {logs.map(log => (
            <div key={log.id} className="flex gap-2 opacity-80 hover:opacity-100 transition-opacity">
              <span className="text-muted-foreground">[{log.timestamp}]</span>
              <span className={`
                ${log.type === 'error' ? 'text-destructive' : ''}
                ${log.type === 'warning' ? 'text-warning' : ''}
                ${log.type === 'success' ? 'text-accent' : ''}
                ${log.type === 'system' ? 'text-primary/70' : ''}
                ${log.type === 'info' ? 'text-foreground' : ''}
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

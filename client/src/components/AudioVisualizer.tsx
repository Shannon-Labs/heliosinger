import React, { memo, useEffect, useRef } from "react";
import type { HeliosingerData } from "@/lib/heliosinger-mapping";

interface AudioVisualizerProps {
  isPlaying: boolean;
  data?: HeliosingerData | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  hue: number;
}

export const AudioVisualizer = memo(function AudioVisualizer({ isPlaying, data }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mountedRef = useRef(true);
  const timeRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas with device pixel ratio for crisp rendering
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize solar particles
    const initParticles = () => {
      particlesRef.current = [];
      const rect = canvas.getBoundingClientRect();
      for (let i = 0; i < 80; i++) {
        particlesRef.current.push(createParticle(rect.width, rect.height, data));
      }
    };
    initParticles();

    const draw = () => {
      if (!mountedRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;

      if (!isPlaying || !data) {
        // Idle state - dim pulsing core
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, width, height);

        timeRef.current += 0.02;
        const pulse = 0.3 + Math.sin(timeRef.current) * 0.1;

        // Draw dim core
        const centerX = width / 2;
        const centerY = height / 2;
        const coreRadius = Math.min(width, height) * 0.15;

        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreRadius * 2);
        gradient.addColorStop(0, `rgba(100, 100, 100, ${pulse})`);
        gradient.addColorStop(0.5, `rgba(50, 50, 50, ${pulse * 0.5})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, coreRadius * 2, 0, Math.PI * 2);
        ctx.fill();

        // Flat line indicator
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Active visualization - extract data
      const velocity = data.velocity || 350;
      const density = data.density || 5;
      const bz = data.bz || 0;
      const kIndex = data.kIndex || 0;
      const frequency = data.frequency;
      const condition = data.condition;
      const harmonicCount = data.harmonicCount || 2;

      timeRef.current += 0.03 + (kIndex * 0.005);

      // Fade effect (faster during storms)
      const fadeAlpha = condition === 'extreme' || condition === 'super_extreme' ? 0.08 : 0.12;
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
      ctx.fillRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // Color based on Bz (south = warm, north = cool)
      const baseHue = bz < 0 ? 20 + (bz * 2) : 200 + (bz * 5);
      const saturation = 80 + (kIndex * 2);
      const lightness = 50 + (kIndex * 3);

      // 1. Solar Core Glow
      const coreRadius = Math.min(width, height) * (0.08 + Math.sin(timeRef.current * 2) * 0.02);
      const corePulse = 1 + Math.sin(timeRef.current * (2 + kIndex * 0.5)) * 0.2;
      const coreIntensity = 0.4 + (kIndex / 9) * 0.4;

      // Multi-layer glow
      for (let layer = 3; layer >= 0; layer--) {
        const layerRadius = coreRadius * (1 + layer * 0.8) * corePulse;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, layerRadius);

        if (condition === 'extreme' || condition === 'super_extreme') {
          gradient.addColorStop(0, `hsla(${baseHue}, 100%, 80%, ${coreIntensity / (layer + 1)})`);
          gradient.addColorStop(0.3, `hsla(${baseHue + 30}, 100%, 60%, ${coreIntensity * 0.6 / (layer + 1)})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        } else {
          gradient.addColorStop(0, `hsla(${baseHue}, ${saturation}%, ${lightness}%, ${coreIntensity / (layer + 1)})`);
          gradient.addColorStop(0.5, `hsla(${baseHue}, ${saturation * 0.8}%, ${lightness * 0.7}%, ${coreIntensity * 0.3 / (layer + 1)})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, layerRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Update and draw particles (solar wind flow)
      const flowSpeed = (velocity / 300);
      particlesRef.current.forEach((p, i) => {
        // Move particle
        p.x += p.vx * flowSpeed;
        p.y += p.vy * flowSpeed * 0.3;
        p.life--;

        // Add turbulence during storms
        if (kIndex >= 5) {
          p.x += (Math.random() - 0.5) * kIndex * 0.3;
          p.y += (Math.random() - 0.5) * kIndex * 0.2;
        }

        // Respawn dead or off-screen particles
        if (p.life <= 0 || p.x > width + 10 || p.x < -10 || p.y > height + 10 || p.y < -10) {
          particlesRef.current[i] = createParticle(width, height, data);
          return;
        }

        // Draw particle with trail
        const alpha = (p.life / p.maxLife) * (0.3 + density * 0.02);
        const particleHue = p.hue + bz * 2;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + density * 0.05), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particleHue}, ${saturation}%, ${lightness}%, ${alpha})`;
        ctx.fill();
      });

      // 3. Frequency waveform (vocal resonance visualization)
      const waveAmplitude = height * 0.15 * (1 + kIndex * 0.05);
      const waveFreq = 0.015 + (frequency / 5000);

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let x = 0; x < width; x++) {
        let y = centerY;

        // Main wave
        y += Math.sin(x * waveFreq + timeRef.current * 3) * waveAmplitude;

        // Harmonics
        for (let h = 1; h <= Math.min(harmonicCount, 4); h++) {
          y += Math.sin(x * waveFreq * (h + 1) + timeRef.current * (3 + h)) * (waveAmplitude / (h * 2));
        }

        // Magnetic distortion during southward Bz
        if (bz < -5) {
          y += (Math.random() - 0.5) * Math.abs(bz) * 0.8;
        }

        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = `hsla(${baseHue}, ${saturation}%, ${lightness}%, 0.6)`;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = `hsla(${baseHue}, 100%, 60%, 0.8)`;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4. Corona flares during extreme conditions
      if (condition === 'extreme' || condition === 'super_extreme') {
        const flareCount = condition === 'super_extreme' ? 8 : 5;
        for (let i = 0; i < flareCount; i++) {
          const angle = (i / flareCount) * Math.PI * 2 + timeRef.current * 0.5;
          const flareLength = coreRadius * (2 + Math.sin(timeRef.current * 3 + i) * 1.5);

          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          const endX = centerX + Math.cos(angle) * flareLength;
          const endY = centerY + Math.sin(angle) * flareLength;
          ctx.lineTo(endX, endY);

          const gradient = ctx.createLinearGradient(centerX, centerY, endX, endY);
          gradient.addColorStop(0, `hsla(${baseHue + 20}, 100%, 70%, 0.8)`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3 + Math.sin(timeRef.current * 5 + i) * 2;
          ctx.stroke();
        }
      }

      // 5. K-index pulsing ring
      if (kIndex >= 3) {
        const ringRadius = coreRadius * (3 + Math.sin(timeRef.current * kIndex) * 0.5);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${baseHue}, 100%, 70%, ${0.1 + kIndex * 0.05})`;
        ctx.lineWidth = 1 + kIndex * 0.3;
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      mountedRef.current = false;
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, data]);

  return (
    <div className="w-full h-32 bg-black border-t-4 border-primary relative overflow-hidden">
      <div className="absolute top-2 left-2 text-xs font-mono text-primary font-bold z-10 bg-black/70 px-2 py-1 border border-primary/30">
        <span className="opacity-70">AUDIO //</span> {data?.vowelName || '--'} <span className="opacity-70">//</span> {data?.frequency?.toFixed(0) || 0}Hz
        {data?.condition && (data.condition === 'extreme' || data.condition === 'super_extreme') && (
          <span className="ml-2 text-destructive animate-pulse">STORM</span>
        )}
      </div>
      {data?.condition && (
        <div className="absolute top-2 right-2 text-xs font-mono z-10 bg-black/70 px-2 py-1 border border-primary/30">
          <span className="opacity-70">Kp:</span> {data.kIndex?.toFixed(0) || 0}
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
});

function createParticle(width: number, height: number, data?: HeliosingerData | null): Particle {
  const velocity = data?.velocity || 350;
  const bz = data?.bz || 0;
  const condition = data?.condition || 'quiet';

  // Spawn from left side, moving right (solar wind direction)
  const spawnFromCenter = Math.random() < 0.3;

  let x: number, y: number, vx: number, vy: number;

  if (spawnFromCenter) {
    // Some particles emanate from center
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 20;
    x = width / 2 + Math.cos(angle) * dist;
    y = height / 2 + Math.sin(angle) * dist;
    vx = Math.cos(angle) * (1 + Math.random() * 2);
    vy = Math.sin(angle) * (0.5 + Math.random());
  } else {
    // Flow from left
    x = Math.random() * 20;
    y = Math.random() * height;
    vx = 1 + Math.random() * (velocity / 200);
    vy = (Math.random() - 0.5) * 0.5;
  }

  // Base hue from Bz
  const hue = bz < 0 ? 30 + Math.random() * 30 : 180 + Math.random() * 60;

  return {
    x,
    y,
    vx,
    vy,
    size: 1 + Math.random() * 2,
    life: 60 + Math.random() * 120,
    maxLife: 180,
    hue,
  };
}

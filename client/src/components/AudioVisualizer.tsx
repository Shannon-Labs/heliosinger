import React, { useEffect, useRef } from "react";
import type { HeliosingerData } from "@/lib/heliosinger-mapping";

interface AudioVisualizerProps {
  isPlaying: boolean;
  data?: HeliosingerData | null;
}

export function AudioVisualizer({ isPlaying, data }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resize canvas
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let time = 0;
    
    // Particle system for "Solar Wind" flow
    const particles: {x: number, y: number, speed: number, size: number}[] = [];
    for(let i=0; i<50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0.5 + Math.random(),
        size: Math.random() * 2
      });
    }

    const draw = () => {
      if (!isPlaying || !data) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw flat line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = '#333';
        ctx.stroke();
        return;
      }

      // Extract data
      const velocity = data.velocity || 350;
      const density = data.density || 5;
      const bz = data.bz || 0;
      const pitch = data.frequency;
      const vowel = data.vowelName;

      time += 0.05;
      
      // Clear with fade for trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Solar Wind Flow (Background)
      // Speed based on velocity
      const flowSpeed = (velocity / 300) * 2; 
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      
      particles.forEach(p => {
        p.x += p.speed * flowSpeed;
        if (p.x > canvas.width) p.x = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (density/5), 0, Math.PI * 2);
        ctx.fill();
      });

      const centerY = canvas.height / 2;
      const amplitude = canvas.height * 0.3;
      
      // Vowel shapes (simulated)
      let frequency = 0.02;
      let complexity = 1;
      
      if (vowel === 'I' || vowel === 'E') {
        frequency = 0.05;
        complexity = 3;
      } else if (vowel === 'A') {
        frequency = 0.03;
        complexity = 2;
      } else {
        frequency = 0.015;
        complexity = 1;
      }

      // Pitch affects wave speed
      const waveSpeed = pitch / 200; 

      // Bz affects color
      // South (negative) = Red/Orange, North (positive) = Blue/Cyan
      const hue = bz < 0 ? 20 + (bz * 2) : 200 + (bz * 5);
      const color = `hsl(${hue}, 100%, 60%)`;

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let x = 0; x < canvas.width; x++) {
        let y = centerY;
        
        // Main wave
        y += Math.sin(x * frequency + time * waveSpeed * 5) * amplitude;
        
        // Harmonics (complexity)
        for (let i = 1; i <= complexity; i++) {
           y += Math.sin(x * frequency * (i * 2) + time * waveSpeed * (5 + i)) * (amplitude / (i * 2));
        }
        
        // Magnetic "Crackle" (Noise) based on Bz volatility (simulated here by just Bz magnitude)
        if (Math.abs(bz) > 5) {
           y += (Math.random() - 0.5) * (Math.abs(bz) * 0.5);
        }

        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw Bz Vector Arrow
      /*
      const arrowX = canvas.width - 30;
      const arrowY = 30;
      const arrowLen = 20;
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(arrowX, arrowY + (bz > 0 ? -arrowLen : arrowLen));
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.stroke();
      */

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, data]);

  return (
    <div className="w-full h-32 bg-black border-t-4 border-primary relative overflow-hidden">
      <div className="absolute top-2 left-2 text-xs font-mono text-primary font-bold z-10 bg-black/50 px-1">
        AUDIO VISUALIZATION // {data?.vowelName || '--'} // {data?.frequency.toFixed(0) || 0}Hz
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

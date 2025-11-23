import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  vowel: string; // 'A', 'E', 'I', 'O', 'U'
  pitch: number; // Frequency in Hz
}

export function AudioVisualizer({ isPlaying, vowel, pitch }: AudioVisualizerProps) {
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

    const draw = () => {
      if (!isPlaying) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw flat line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.strokeStyle = '#333';
        ctx.stroke();
        return;
      }

      time += 0.05;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fade effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerY = canvas.height / 2;
      const amplitude = canvas.height * 0.3;
      
      // Vowel shapes (simulated)
      // I: High freq, jagged
      // U: Low freq, smooth
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

      // Pitch affects speed
      const speed = pitch / 200; 

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      for (let x = 0; x < canvas.width; x++) {
        let y = centerY;
        
        // Main wave
        y += Math.sin(x * frequency + time * speed * 5) * amplitude;
        
        // Harmonics (complexity)
        for (let i = 1; i <= complexity; i++) {
           y += Math.sin(x * frequency * (i * 2) + time * speed * (5 + i)) * (amplitude / (i * 2));
        }
        
        // Noise/Texture
        y += (Math.random() - 0.5) * 2;

        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = 'hsl(200, 100%, 50%)'; // Primary blue
      ctx.lineWidth = 2;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'hsl(200, 100%, 50%)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, vowel, pitch]);

  return (
    <div className="w-full h-32 bg-black border-t-4 border-primary relative overflow-hidden">
      <div className="absolute top-2 left-2 text-xs font-mono text-primary font-bold z-10">
        AUDIO VISUALIZATION // {vowel} // {pitch.toFixed(0)}Hz
      </div>
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

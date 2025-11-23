import React from "react";

export function BrutalistLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`font-mono font-black tracking-tighter flex items-center justify-center bg-primary text-primary-foreground border-2 border-foreground p-2 ${className}`}>
      <span className="text-2xl leading-none">HELIO</span>
      <span className="text-2xl leading-none italic">SINGER</span>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface AnimatedMetricsProps {
  data?: ComprehensiveSpaceWeatherData;
}

export function AnimatedMetrics({ data }: AnimatedMetricsProps) {
  const [displayVelocity, setDisplayVelocity] = useState(0);
  const [displayDensity, setDisplayDensity] = useState(0);
  const [displayBz, setDisplayBz] = useState(0);
  const [displayKp, setDisplayKp] = useState(0);

  useEffect(() => {
    if (!data) return;

    const animateValue = (start: number, end: number, setter: (v: number) => void, duration = 1000) => {
      const startTime = Date.now();
      const animate = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        const current = start + (end - start) * progress;
        setter(current);
        if (progress < 1) requestAnimationFrame(animate);
      };
      animate();
    };

    animateValue(displayVelocity, data.solar_wind.velocity, setDisplayVelocity);
    animateValue(displayDensity, data.solar_wind.density, setDisplayDensity);
    animateValue(displayBz, data.solar_wind.bz, setDisplayBz);
    animateValue(displayKp, data.k_index.kp, setDisplayKp);
  }, [data]);

  if (!data) return null;

  return (
    <Card className="bg-black/80 border-2 border-primary/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Velocity */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Velocity</div>
            <div className="text-2xl font-black text-accent">
              {displayVelocity.toFixed(0)}
            </div>
            <div className="text-xs font-mono text-muted-foreground">km/s</div>
            <Badge 
              variant="outline" 
              className={`mt-2 text-xs ${
                data.solar_wind.velocity > 500 ? 'text-accent border-accent' : 'text-muted-foreground'
              }`}
            >
              {data.solar_wind.velocity > 500 ? 'FAST' : 'SLOW'}
            </Badge>
          </motion.div>

          {/* Density */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Density</div>
            <div className="text-2xl font-black" style={{ color: '#00ffe1' }}>
              {displayDensity.toFixed(1)}
            </div>
            <div className="text-xs font-mono text-muted-foreground">p/cm³</div>
          </motion.div>

          {/* Bz */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mag Field</div>
            <div className={`text-2xl font-black ${
              data.solar_wind.bz < 0 ? 'text-destructive' : 'text-success'
            }`}>
              {displayBz.toFixed(1)}
            </div>
            <div className="text-xs font-mono text-muted-foreground">nT</div>
            <Badge 
              variant="outline" 
              className={`mt-2 text-xs ${
                data.solar_wind.bz < -5 ? 'text-destructive border-destructive' : 
                data.solar_wind.bz < 0 ? 'text-warning border-warning' : 'text-success border-success'
              }`}
            >
              {data.solar_wind.bz < 0 ? 'SOUTH' : 'NORTH'}
            </Badge>
          </motion.div>

          {/* Kp */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Activity</div>
            <div className={`text-2xl font-black ${
              data.k_index.kp >= 5 ? 'text-destructive' : 
              data.k_index.kp >= 3 ? 'text-warning' : 'text-success'
            }`}>
              {displayKp.toFixed(1)}
            </div>
            <div className="text-xs font-mono text-muted-foreground uppercase">Kp</div>
          </motion.div>
        </div>
      </CardContent>
    </Card>
  );
}
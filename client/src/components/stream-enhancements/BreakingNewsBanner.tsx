import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { ComprehensiveSpaceWeatherData } from '@shared/schema';

interface BreakingNewsBannerProps {
  data?: ComprehensiveSpaceWeatherData;
}

export function BreakingNewsBanner({ data }: BreakingNewsBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<'info' | 'warning' | 'critical'>('info');

  useEffect(() => {
    if (!data) return;

    const { kp, solar_wind } = data;
    const bz = solar_wind.bz;

    // Trigger banner for significant events
    if (kp >= 7) {
      setMessage('⚠️ EXTREME GEOMAGNETIC STORM IN PROGRESS');
      setSeverity('critical');
      setShowBanner(true);
    } else if (kp >= 5) {
      setMessage('⚡ GEOMAGNETIC STORM DETECTED - Conditions intensifying');
      setSeverity('warning');
      setShowBanner(true);
    } else if (bz <= -10) {
      setMessage('🧲 SEVERE SOUTHWARD MAGNETIC FIELD - Storm potential high');
      setSeverity('warning');
      setShowBanner(true);
    } else if (bz <= -5) {
      setMessage('🧲 STRONG SOUTHWARD Bz - Aurora watchers prepare');
      setSeverity('info');
      setShowBanner(true);
    } else if (solar_wind.velocity > 600) {
      setMessage('🚀 HIGH SPEED SOLAR WIND STREAM ARRIVED');
      setSeverity('info');
      setShowBanner(true);
    } else {
      // Hide banner after a delay for normal conditions
      const timeout = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timeout);
    }
  }, [data]);

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`
            fixed top-0 left-0 right-0 z-50 
            ${severity === 'critical' ? 'bg-destructive' : severity === 'warning' ? 'bg-warning' : 'bg-primary'}
            text-black font-black text-xl uppercase
            py-4 text-center
            shadow-2xl border-b-4 border-white
          `}
        >
          <div className="animate-pulse">
            🔴 BREAKING: {message} 🔴
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
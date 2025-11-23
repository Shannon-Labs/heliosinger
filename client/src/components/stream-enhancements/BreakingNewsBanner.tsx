import React, { useState, useEffect, useRef } from 'react';
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
  const hideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!data || !data.solar_wind || !data.k_index) return;

    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }

    const kp = data.k_index.kp;
    const solar_wind = data.solar_wind;
    const bz = solar_wind.bz;

    if (kp >= 7) {
      setMessage('EXTREME GEOMAGNETIC STORM IN PROGRESS');
      setSeverity('critical');
      setShowBanner(true);
    } else if (kp >= 5) {
      setMessage('GEOMAGNETIC STORM DETECTED - CONDITIONS INTENSIFYING');
      setSeverity('warning');
      setShowBanner(true);
    } else if (bz <= -10) {
      setMessage('SEVERE SOUTHWARD MAGNETIC FIELD - STORM POTENTIAL HIGH');
      setSeverity('warning');
      setShowBanner(true);
    } else if (bz <= -5) {
      setMessage('STRONG SOUTHWARD BZ - AURORA WATCHERS PREPARE');
      setSeverity('info');
      setShowBanner(true);
    } else if (solar_wind.velocity > 600) {
      setMessage('HIGH SPEED SOLAR WIND STREAM ARRIVED');
      setSeverity('info');
      setShowBanner(true);
    } else {
      // Hide banner after a delay for normal conditions
      const timeout = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timeout);
    }

    // Auto-hide after 12 seconds even if conditions persist
    hideTimer.current = setTimeout(() => setShowBanner(false), 12000);
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
          <div className="animate-pulse tracking-widest flex items-center justify-center gap-3">
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 3 2 21h20L12 3z"
                stroke="black"
                strokeWidth="2"
                fill="black"
              />
              <path d="M12 9v5" stroke="white" strokeWidth="2" />
              <circle cx="12" cy="16" r="1.2" fill="white" />
            </svg>
            BREAKING: {message}
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 3 2 21h20L12 3z"
                stroke="black"
                strokeWidth="2"
                fill="black"
              />
              <path d="M12 9v5" stroke="white" strokeWidth="2" />
              <circle cx="12" cy="16" r="1.2" fill="white" />
            </svg>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

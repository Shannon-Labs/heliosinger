import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamIntroProps {
  onComplete: () => void;
}

type IntroStep = {
  title: string;
  subtitle: string;
  detail?: string;
  track?: 'space-weather' | 'acoustics' | 'electromagnetism';
  duration: number;
};

const TRACK_COLORS = {
  'space-weather': 'text-amber-400',
  'acoustics': 'text-emerald-400',
  'electromagnetism': 'text-violet-400',
};

export function StreamIntro({ onComplete }: StreamIntroProps) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(true);

  const introSteps: IntroStep[] = [
    {
      title: "HELIOSINGER",
      subtitle: "The Sun Sings Space Weather",
      duration: 2000,
    },
    {
      title: "LIVE DATA",
      subtitle: "NOAA DSCOVR Satellite at L1 Lagrange Point",
      detail: "1.5 million km from Earth, watching the sun 24/7",
      duration: 2500,
    },
    {
      title: "SPACE WEATHER",
      subtitle: "Solar wind, magnetic storms, coronal mass ejections",
      detail: "Velocity sets pitch. Density shapes texture. Kp drives rhythm.",
      track: 'space-weather',
      duration: 3000,
    },
    {
      title: "ELECTROMAGNETISM",
      subtitle: "The invisible battle between Sun and Earth",
      detail: "Bz orientation determines if energy enters our magnetosphere",
      track: 'electromagnetism',
      duration: 3000,
    },
    {
      title: "ACOUSTICS",
      subtitle: "Data becomes sound through vowel formants",
      detail: "Each solar condition produces a distinct vocal quality",
      track: 'acoustics',
      duration: 3000,
    },
    {
      title: "STREAM ACTIVE",
      subtitle: "Listen to the universe",
      duration: 1500,
    },
  ];

  useEffect(() => {
    const currentStep = introSteps[step];
    const timer = setTimeout(() => {
      if (step < introSteps.length - 1) {
        setStep(step + 1);
      } else {
        const fadeTimer = setTimeout(() => {
          setShow(false);
          onComplete();
        }, 800);
        return () => clearTimeout(fadeTimer);
      }
    }, currentStep.duration);

    return () => clearTimeout(timer);
  }, [step, introSteps.length, onComplete]);

  const currentStep = introSteps[step];
  const trackColor = currentStep.track ? TRACK_COLORS[currentStep.track] : 'text-primary';

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black overflow-hidden"
        >
          {/* Animated background grid */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="w-full h-full"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
              }}
            />
          </div>

          {/* Radial gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,black_80%)]" />

          <motion.div
            key={step}
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.1, opacity: 0, y: -30 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="text-center relative z-10 max-w-3xl px-8"
          >
            {/* Track indicator */}
            {currentStep.track && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <span className={`text-xs font-black tracking-[0.4em] uppercase ${trackColor}`}>
                  {currentStep.track.replace('-', ' ')}
                </span>
              </motion.div>
            )}

            {/* Main title */}
            <h1 className={`text-5xl md:text-7xl font-black uppercase tracking-tight mb-4 ${
              currentStep.track ? trackColor : 'text-primary'
            }`}>
              {currentStep.title}
            </h1>

            {/* Subtitle */}
            <p className="text-lg md:text-2xl text-white/90 font-medium mb-4">
              {currentStep.subtitle}
            </p>

            {/* Detail text */}
            {currentStep.detail && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-sm md:text-base text-white/50 font-mono max-w-xl mx-auto"
              >
                {currentStep.detail}
              </motion.p>
            )}

            {/* Progress bar */}
            <div className="mt-12 flex justify-center gap-1">
              {introSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 transition-all duration-300 ${
                    i === step
                      ? `w-8 ${currentStep.track ? TRACK_COLORS[currentStep.track].replace('text-', 'bg-') : 'bg-primary'}`
                      : i < step
                        ? 'w-4 bg-white/40'
                        : 'w-4 bg-white/10'
                  }`}
                />
              ))}
            </div>

            {/* Skip hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ delay: 1 }}
              className="absolute bottom-[-60px] left-0 right-0 text-center"
            >
              <span className="text-xs text-white/30 font-mono tracking-wider">
                Loading live data stream...
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

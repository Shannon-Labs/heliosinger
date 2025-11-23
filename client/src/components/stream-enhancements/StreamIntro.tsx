import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StreamIntroProps {
  onComplete: () => void;
}

export function StreamIntro({ onComplete }: StreamIntroProps) {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(true);

  const introSteps = [
    {
      title: "HELIOSINGER",
      subtitle: "The Sun Sings Space Weather",
      accent: "🔊",
    },
    {
      title: "LIVE SONIFICATION",
      subtitle: "Real-time data from NOAA DSCOVR",
      accent: "🛰️",
    },
    {
      title: "TRAINING MODE",
      subtitle: "Learn to hear what the sun is saying",
      accent: "🎵",
    },
    {
      title: "STREAM ACTIVE",
      subtitle: "Listening to the solar wind...",
      accent: "☀️",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step < introSteps.length - 1) {
        setStep(step + 1);
      } else {
        const fadeTimer = setTimeout(() => {
          setShow(false);
          onComplete();
        }, 2000);
        return () => clearTimeout(fadeTimer);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [step, introSteps.length, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        >
          <motion.div
            key={step}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 1.2, opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="text-center"
          >
            <div className="text-8xl mb-8">{introSteps[step].accent}</div>
            <h1 className="text-6xl font-black text-primary uppercase tracking-wider mb-4">
              {introSteps[step].title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {introSteps[step].subtitle}
            </p>
            
            {/* Progress dots */}
            <div className="flex justify-center gap-2 mt-12">
              {introSteps.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-500 ${
                    i === step ? 'bg-primary scale-125' : 'bg-primary/30'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
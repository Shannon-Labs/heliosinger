import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Reaction {
  id: number;
  message: string;
  type: 'question' | 'enthusiasm' | 'learning' | 'event';
  timestamp: number;
}

const REACTION_TEMPLATES = {
  quiet: [
    { message: "This is so calming 🎵", type: 'enthusiasm' as const },
    { message: "What does 'U' vowel mean?", type: 'question' as const },
    { message: "Finally a science stream I can vibe to", type: 'enthusiasm' as const },
    { message: "Learning so much about space weather!", type: 'learning' as const },
    { message: "Perfect background for studying", type: 'enthusiasm' as const },
  ],
  moderate: [
    { message: "Whoa the pitch just went up!", type: 'learning' as const },
    { message: "Is that a solar wind stream?", type: 'question' as const },
    { message: "The hologram is spinning faster!", type: 'enthusiasm' as const },
    { message: "This is better than weather channel", type: 'enthusiasm' as const },
    { message: "My cat is fascinated by this 😂", type: 'enthusiasm' as const },
  ],
  'kp-watch': [
    { message: "Kp is climbing! Storm incoming?", type: 'question' as const },
    { message: "I can hear the rhythm changing", type: 'learning' as const },
    { message: "Aurora potential increasing!", type: 'event' as const },
    { message: "The sun is getting active 🌞", type: 'enthusiasm' as const },
  ],
  storm: [
    { message: "🔥 THIS IS AMAZING!", type: 'enthusiasm' as const },
    { message: "The sun is SINGING right now!", type: 'enthusiasm' as const },
    { message: "Can everyone hear the change?", type: 'question' as const },
    { message: "Geomagnetic storm sounds epic", type: 'learning' as const },
    { message: "My aurora app is going off!", type: 'event' as const },
    { message: "This is history happening live", type: 'event' as const },
  ],
  cme: [
    { message: "🚨 CME IMPACT DETECTED!", type: 'event' as const },
    { message: "The sound just changed dramatically!", type: 'enthusiasm' as const },
    { message: "What happens after a CME hits?", type: 'question' as const },
    { message: "This is why I watch this stream", type: 'enthusiasm' as const },
    { message: "Check the CME on NASA's site!", type: 'event' as const },
  ]
};

export function ViewerReactions() {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const nextId = React.useRef(0);

  const getReactionPool = () => {
    const kp = Math.random() * 9; // Simulate current activity
    const isCME = Math.random() > 0.95; // 5% chance of CME reaction
    
    if (isCME) return REACTION_TEMPLATES.cme;
    if (kp >= 7) return REACTION_TEMPLATES.storm;
    if (kp >= 5) return REACTION_TEMPLATES['kp-watch'];
    if (kp >= 3) return REACTION_TEMPLATES.moderate;
    return REACTION_TEMPLATES.quiet;
  };

  const addReaction = () => {
    const pool = getReactionPool();
    const template = pool[Math.floor(Math.random() * pool.length)];
    
    setReactions(prev => {
      const newReaction: Reaction = {
        id: nextId.current++,
        ...template,
        timestamp: Date.now()
      };
      return [...prev, newReaction].slice(-8); // Keep last 8 reactions
    });
  };

  // Add reactions periodically
  useEffect(() => {
    const randomInterval = () => 5000 + Math.random() * 10000; // 5-15 seconds
    
    const scheduleNext = () => {
      const timeout = setTimeout(() => {
        addReaction();
        scheduleNext();
      }, randomInterval());
      return timeout;
    };

    const timeout = scheduleNext();
    return () => clearTimeout(timeout);
  }, []);

  // Clean up old reactions
  useEffect(() => {
    const cleanup = setInterval(() => {
      setReactions(prev => {
        const now = Date.now();
        return prev.filter(r => now - r.timestamp < 60000); // Remove after 60s
      });
    }, 5000);

    return () => clearInterval(cleanup);
  }, []);

  if (reactions.length === 0) return null;

  return (
    <div className="absolute top-20 right-6 w-80 z-40 pointer-events-none">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <motion.div
            key={reaction.id}
            initial={{ x: 400, opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 0.9, scale: 1 }}
            exit={{ x: 400, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`
              bg-black/90 border-2 rounded-lg p-3 mb-2
              ${reaction.type === 'event' ? 'border-destructive' : 
                reaction.type === 'enthusiasm' ? 'border-accent' : 
                reaction.type === 'learning' ? 'border-primary' : 
                'border-muted-foreground'}
              backdrop-blur-sm
            `}
          >
            <div className="flex items-start gap-2">
              <span className="text-xs mt-1">
                {reaction.type === 'event' ? '🚨' :
                 reaction.type === 'enthusiasm' ? '🔥' :
                 reaction.type === 'learning' ? '💡' : '❓'}
              </span>
              <span className="text-xs font-medium text-white">
                {reaction.message}
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" />

      <div className="relative z-10 w-full max-w-2xl text-center flex flex-col items-center gap-6">
        <motion.div
          className="h-1 w-16 bg-accent rounded-full"
          initial={{ scaleX: 0, originX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />

        <motion.h2
          className="font-display font-black leading-tight text-white"
          style={{
            fontSize: 'clamp(2rem, 8vw, 5rem)',
            textShadow: '0 4px 20px rgba(0,0,0,0.95)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Ogni albero conta.<br />
          <span className="text-accent">Mappalo.</span>
        </motion.h2>

        <motion.div
          className="bg-black/70 backdrop-blur-sm rounded-2xl p-5 border border-white/20 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-white font-medium leading-relaxed" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)' }}>
            Condividi le tue piantumazioni con la community.<br />
            Ogni albero è geolocalizzato e verificato tramite AI.
          </p>
        </motion.div>

        <motion.div
          className="w-full bg-black/60 backdrop-blur-md rounded-2xl p-5 border border-white/20 flex items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ type: 'spring', bounce: 0.3 }}
        >
          <div className="w-12 h-12 shrink-0 rounded-full bg-primary flex items-center justify-center text-2xl">🌳</div>
          <div className="text-left">
            <div className="text-white font-bold" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.3rem)' }}>Quercia Rossa</div>
            <div className="text-white/70" style={{ fontSize: 'clamp(0.8rem, 2vw, 1rem)' }}>Verificato dall'AI · Parco Nord</div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

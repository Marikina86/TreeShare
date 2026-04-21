import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0, scale: 1.1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 50, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-40 h-40 mb-8 rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white/30"
        >
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="TreeShare Logo"
            className="w-full h-full object-cover"
          />
        </motion.div>

        <h1 className="text-[7vw] font-display font-black text-white leading-tight tracking-tight"
          style={{ textShadow: '0 4px 24px rgba(0,0,0,0.8), 0 2px 8px rgba(0,0,0,0.9)' }}>
          {'TreeShare'.split('').map((char, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={{ opacity: 0, y: 40, filter: 'blur(10px)' }}
              animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 40, filter: 'blur(10px)' }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 20 }}
            >
              {char}
            </motion.span>
          ))}
        </h1>

        <motion.div
          className="mt-6 px-8 py-4 bg-black/50 backdrop-blur-md rounded-2xl border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <p className="text-[2vw] text-white font-medium">
            La prima piattaforma sociale italiana per il verde urbano.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

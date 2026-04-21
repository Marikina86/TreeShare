import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1700),
      setTimeout(() => setPhase(4), 2400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/90" />

      <div className="relative z-10 text-center flex flex-col items-center px-6 gap-5">
        <motion.div
          className="rounded-[1.8rem] overflow-hidden shadow-2xl border-4 border-white/30"
          style={{ width: 'clamp(5rem, 18vw, 8rem)', height: 'clamp(5rem, 18vw, 8rem)' }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <img
            src={`${import.meta.env.BASE_URL}images/logo.png`}
            alt="TreeShare"
            className="w-full h-full object-cover"
          />
        </motion.div>

        <motion.h2
          className="font-display font-black text-white leading-none"
          style={{
            fontSize: 'clamp(2.4rem, 10vw, 6rem)',
            textShadow: '0 4px 24px rgba(0,0,0,0.95)',
          }}
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          Pianta il futuro.
        </motion.h2>

        <motion.p
          className="text-accent font-bold"
          style={{ fontSize: 'clamp(1rem, 3.5vw, 2rem)' }}
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8 }}
        >
          Unisciti alla community TreeShare oggi stesso.
        </motion.p>

        <motion.div
          className="bg-black/65 backdrop-blur-md rounded-2xl px-8 py-5 border border-white/20 flex flex-col items-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ type: 'spring', bounce: 0.4 }}
        >
          <div className="text-white/60 font-medium" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)' }}>
            Accedi direttamente dal browser
          </div>
          <div
            className="text-white font-black tracking-wide"
            style={{ fontSize: 'clamp(1.3rem, 5vw, 2.5rem)' }}
          >
            treeshareapp.com
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-3 px-6 py-3 bg-primary/30 border border-primary/40 rounded-full"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent shrink-0">
            <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <span className="text-white font-semibold" style={{ fontSize: 'clamp(0.85rem, 2.5vw, 1.2rem)' }}>
            Scaricabile direttamente dal sito, senza app store
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}

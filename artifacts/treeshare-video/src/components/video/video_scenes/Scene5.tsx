import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 800),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 3500),
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/85" />

      <div className="relative z-10 text-center flex flex-col items-center px-[8vw]">
        <motion.div
          className="w-28 h-28 rounded-[2rem] overflow-hidden mb-8 shadow-2xl border-4 border-white/30"
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
          className="text-[6.5vw] font-display font-black text-white leading-none mb-4"
          style={{ textShadow: '0 4px 24px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,1)' }}
          initial={{ opacity: 0, y: 50 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          Pianta il futuro.
        </motion.h2>

        <motion.p
          className="text-[2.2vw] text-accent font-semibold mb-10"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8 }}
        >
          Unisciti alla community TreeShare oggi stesso.
        </motion.p>

        <motion.div
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ type: 'spring', bounce: 0.4 }}
        >
          <div className="bg-black/60 backdrop-blur-md rounded-2xl px-10 py-5 border border-white/20">
            <div className="text-white/60 text-lg mb-2 font-medium">Accedi direttamente dal browser</div>
            <div className="text-white font-black text-[2.5vw] tracking-wide">treeshareapp.com</div>
          </div>

          <motion.div
            className="flex items-center gap-3 px-6 py-3 bg-primary/30 border border-primary/40 rounded-full"
            initial={{ opacity: 0 }}
            animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
              <path d="M12 8v4l3 3" />
            </svg>
            <span className="text-white font-semibold text-lg">
              PWA — Installa in un click dal browser
            </span>
          </motion.div>
        </motion.div>

        <motion.p
          className="mt-8 text-white/50 text-[1.4vw]"
          initial={{ opacity: 0 }}
          animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          Disponibile su tutti i dispositivi · Nessun app store necessario
        </motion.p>
      </div>
    </motion.div>
  );
}

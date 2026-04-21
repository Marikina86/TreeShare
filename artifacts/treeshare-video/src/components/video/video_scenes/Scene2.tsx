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
      setTimeout(() => setPhase(5), 3200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-between px-[8vw]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />

      <div className="w-[48%] z-10">
        <motion.div
          className="h-[4px] w-24 bg-accent mb-8"
          initial={{ scaleX: 0, originX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
        <motion.h2
          className="text-[4.5vw] font-display font-black leading-tight mb-6 text-white"
          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,1)' }}
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Ogni albero conta.<br />
          <span className="text-accent">Mappalo.</span>
        </motion.h2>

        <motion.div
          className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[1.6vw] text-white font-medium leading-relaxed">
            Condividi le tue piantumazioni con la community.<br />
            Ogni albero è geolocalizzato e verificato tramite AI.
          </p>
        </motion.div>
      </div>

      <div className="w-[44%] h-[70vh] relative z-10">
        <motion.div
          className="w-full h-full rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl"
          initial={{ opacity: 0, x: 100 }}
          animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 100 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-full h-full bg-gradient-to-br from-green-900 to-green-700 flex items-center justify-center relative">
            <svg viewBox="0 0 200 200" className="w-full h-full opacity-20 absolute inset-0">
              {[...Array(12)].map((_, i) => (
                <circle key={i} cx={20 + (i % 4) * 55} cy={20 + Math.floor(i / 4) * 65} r="6" fill="#15803d" />
              ))}
            </svg>
            <div className="relative z-10 text-center p-8">
              <div className="text-6xl mb-4">🗺️</div>
              <div className="text-white/80 text-xl font-medium">Mappa degli alberi</div>
              <div className="text-white/50 text-sm mt-2">Geolocalizzati e verificati</div>
            </div>
          </div>

          <motion.div
            className="absolute bottom-6 left-6 right-6 p-5 bg-black/70 backdrop-blur-md rounded-2xl border border-white/20"
            initial={{ y: 50, opacity: 0 }}
            animate={phase >= 5 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.4 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-2xl">🌳</div>
              <div>
                <div className="text-white font-bold text-lg">Quercia Rossa</div>
                <div className="text-white/70 text-sm">Verificato dall'AI • Parco Nord</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

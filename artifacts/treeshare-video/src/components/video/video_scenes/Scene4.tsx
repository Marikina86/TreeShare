import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1600),
      setTimeout(() => setPhase(5), 3500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center px-[8vw]"
      initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
      animate={{ clipPath: 'polygon(0% 0, 100% 0, 100% 100%, 0% 100%)' }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-l from-black/80 via-black/50 to-black/30" />

      <div className="w-1/2 relative z-10 h-[70vh]">
        <motion.div
          className="w-full h-full rounded-[2rem] overflow-hidden border border-white/20 relative shadow-2xl bg-gradient-to-br from-green-900 via-green-800 to-emerald-900"
          initial={{ opacity: 0, x: -100 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -100 }}
          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center p-10">
            <div className="text-7xl mb-6">🌍</div>
            <div className="text-white/60 text-lg text-center">Campagna ambientale aziendale</div>
          </div>

          <motion.div
            className="absolute bottom-6 left-6 right-6 p-6 bg-black/70 backdrop-blur-md rounded-xl border border-white/20"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-white text-lg">Campagna Sostenibilità 2025</span>
              <span className="text-accent font-bold text-lg">€15.000</span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: '0%' }}
                animate={phase >= 4 ? { width: '75%' } : { width: '0%' }}
                transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
              />
            </div>
            <div className="text-white/60 text-sm mt-2">75% dell'obiettivo raggiunto</div>
          </motion.div>
        </motion.div>
      </div>

      <div className="w-1/2 pl-14 z-10">
        <motion.div
          className="inline-block px-5 py-2 bg-accent/20 border border-accent/40 rounded-full text-sm font-bold tracking-wide mb-6 text-accent"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        >
          PER LE AZIENDE CON P.IVA
        </motion.div>

        <motion.h2
          className="text-[4vw] font-display font-black leading-tight mb-6 text-white"
          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          La responsabilità sociale,{' '}
          <span className="text-accent">certificata.</span>
        </motion.h2>

        <motion.div
          className="bg-black/60 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-[1.5vw] text-white font-medium leading-relaxed">
            Le organizzazioni con Partita IVA possono lanciare campagne ambientali a pagamento, con trasparenza totale e impatto misurabile.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1200),
      setTimeout(() => setPhase(4), 1800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const features = [
    { icon: '🌍', label: 'Campagne ambientali a pagamento' },
    { icon: '📊', label: 'Impatto misurabile e trasparente' },
    { icon: '✅', label: 'Certificazione CSR digitale' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 py-8"
      initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
      animate={{ clipPath: 'polygon(0% 0, 100% 0, 100% 100%, 0% 100%)' }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-black/80" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center gap-5">
        <motion.div
          className="inline-block px-5 py-2 bg-accent/20 border border-accent/40 rounded-full font-bold text-accent"
          style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        >
          PER LE AZIENDE CON P.IVA
        </motion.div>

        <motion.h2
          className="font-display font-black leading-tight text-white"
          style={{
            fontSize: 'clamp(2rem, 8vw, 4.5rem)',
            textShadow: '0 4px 20px rgba(0,0,0,0.95)',
          }}
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          La responsabilità sociale,{' '}
          <span className="text-accent">certificata.</span>
        </motion.h2>

        <motion.div
          className="bg-black/65 backdrop-blur-sm rounded-2xl p-5 border border-white/20 w-full"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-white font-medium leading-relaxed" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.3rem)' }}>
            Le organizzazioni con Partita IVA possono lanciare campagne ambientali con trasparenza totale e impatto misurabile.
          </p>
        </motion.div>

        <div className="flex flex-col gap-3 w-full">
          {features.map((f, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4 bg-black/50 border border-white/15 rounded-xl px-5 py-3 text-left"
              initial={{ opacity: 0, x: 40 }}
              animate={phase >= 4 ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
              transition={{ delay: i * 0.1, type: 'spring', bounce: 0.3 }}
            >
              <span style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)' }}>{f.icon}</span>
              <span className="text-white font-semibold" style={{ fontSize: 'clamp(0.85rem, 2.2vw, 1.2rem)' }}>{f.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

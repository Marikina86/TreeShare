import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 100),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1000),
      setTimeout(() => setPhase(4), 1500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const cards = [
    { title: 'Adozioni', desc: 'Sostieni alberi a distanza', icon: '🌱' },
    { title: 'Eventi', desc: 'Azioni locali di piantumazione', icon: '📅' },
    { title: 'Community', desc: 'Connettiti con eco-appassionati', icon: '🤝' },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-5 py-6"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: '0%' }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/65 to-black/85" />

      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center text-center gap-6">
        <motion.h2
          className="font-display font-black leading-tight text-white"
          style={{
            fontSize: 'clamp(2rem, 8vw, 4.5rem)',
            textShadow: '0 4px 20px rgba(0,0,0,0.95)',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Adotta. Partecipa. <span className="text-accent">Impatta.</span>
        </motion.h2>

        <div className="grid grid-cols-3 gap-3 w-full">
          {cards.map((item, i) => (
            <motion.div
              key={i}
              className="bg-black/65 border border-white/20 rounded-2xl p-4 backdrop-blur-md flex flex-col items-center text-center"
              initial={{ opacity: 0, y: 40 }}
              animate={phase >= i + 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ type: 'spring', bounce: 0.3 }}
            >
              <div className="mb-3" style={{ fontSize: 'clamp(1.8rem, 5vw, 3rem)' }}>{item.icon}</div>
              <h3 className="font-bold text-white mb-1" style={{ fontSize: 'clamp(0.9rem, 2.5vw, 1.4rem)' }}>{item.title}</h3>
              <p className="text-white/80 leading-snug" style={{ fontSize: 'clamp(0.75rem, 2vw, 1rem)' }}>{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

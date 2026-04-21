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
      setTimeout(() => setPhase(5), 3200),
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
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: '0%' }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />

      <div className="relative z-10 w-full px-[8vw] flex flex-col items-center text-center">
        <motion.h2
          className="text-[5.5vw] font-display font-black leading-tight mb-10 text-white"
          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.9)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Adotta. Partecipa. <span className="text-accent">Impatta.</span>
        </motion.h2>

        <div className="grid grid-cols-3 gap-6 w-full">
          {cards.map((item, i) => (
            <motion.div
              key={i}
              className="bg-black/60 border border-white/20 rounded-3xl p-8 backdrop-blur-md"
              initial={{ opacity: 0, y: 50 }}
              animate={phase >= i + 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ type: 'spring', bounce: 0.3 }}
            >
              <div className="text-5xl mb-5">{item.icon}</div>
              <h3 className="text-2xl font-bold mb-3 text-white">{item.title}</h3>
              <p className="text-white/80 text-lg leading-snug">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

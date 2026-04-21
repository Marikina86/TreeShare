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
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <motion.div 
          className="w-full h-full"
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          transition={{ duration: 4, ease: "easeOut" }}
        >
          <img src={`${import.meta.env.BASE_URL}images/planting.jpg`} alt="Planting" className="w-full h-full object-cover opacity-40 mix-blend-luminosity" />
        </motion.div>
      </div>

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 50, rotateX: 45 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: 45 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-32 h-32 mb-8 bg-white/10 rounded-[2rem] border border-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-primary">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 0 0 9-9 9 9 0 0 0-9-9 9 9 0 0 0-9 9 9 9 0 0 0 9 9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01" />
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </motion.div>

        <h1 className="text-[6vw] font-display font-black text-white leading-tight tracking-tight drop-shadow-lg">
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
        
        <motion.p 
          className="text-[2vw] text-white/80 mt-6 max-w-3xl font-light drop-shadow-md"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          La prima piattaforma social italiana per il nostro pianeta.
        </motion.p>
      </div>
    </motion.div>
  );
}

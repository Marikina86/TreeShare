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
      className="absolute inset-0 flex items-center justify-center bg-bg-dark"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div 
          className="w-full h-full"
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 4, ease: "easeOut" }}
        >
          <img src={`${import.meta.env.BASE_URL}images/adoption.jpg`} alt="Adoption" className="w-full h-full object-cover mix-blend-screen" />
        </motion.div>
      </div>

      <div className="relative z-10 text-center flex flex-col items-center">
        <motion.h2 
          className="text-[6vw] font-display font-black text-white leading-none mb-4"
          initial={{ opacity: 0, y: 50, rotateX: -40 }}
          animate={phase >= 1 ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 50, rotateX: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          Pianta il futuro.
        </motion.h2>
        
        <motion.p 
          className="text-[2vw] text-primary mb-12 font-medium"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={phase >= 2 ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(10px)' }}
          transition={{ duration: 0.8 }}
        >
          Scarica l'app TreeShare oggi.
        </motion.p>

        <motion.div
          className="flex gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ type: "spring", bounce: 0.5 }}
        >
          <div className="px-8 py-4 bg-white text-bg-dark rounded-full font-bold text-xl flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.62 1.63-1.52 3.12-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            App Store
          </div>
          <div className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-full font-bold text-xl flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M3.6 20.48L20 12.01 3.6 3.53v16.95zM15.5 12l-4.5 4.5-4.5-4.5L15.5 12z"/></svg>
            Google Play
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

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
      className="absolute inset-0 flex items-center justify-between px-[10vw]"
      initial={{ clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ clipPath: 'circle(150% at 50% 50%)' }}
      exit={{ x: '-100%', opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-[45%] z-10">
        <motion.div 
          className="h-[4px] w-24 bg-accent mb-8"
          initial={{ scaleX: 0, originX: 0 }}
          animate={phase >= 1 ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        <motion.h2 
          className="text-[4.5vw] font-display font-bold leading-tight mb-6"
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Ogni albero conta.<br/>
          <span className="text-primary-foreground text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Mappalo.</span>
        </motion.h2>
        
        <motion.p
          className="text-[1.5vw] text-white/70 font-light"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          Condividi le tue piantumazioni con la community. 
          Ogni albero è geolocalizzato e verificato tramite AI.
        </motion.p>
      </div>

      <div className="w-[45%] h-[70vh] relative z-10 perspective-[1000px]">
        <motion.div
          className="w-full h-full rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl"
          initial={{ opacity: 0, rotateY: 30, x: 100, z: -100 }}
          animate={phase >= 4 ? { opacity: 1, rotateY: -10, x: 0, z: 0 } : { opacity: 0, rotateY: 30, x: 100, z: -100 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <img src={`${import.meta.env.BASE_URL}images/map-trees.jpg`} alt="Map" className="w-full h-full object-cover" />
          
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-bg-dark/80 to-transparent"
            initial={{ opacity: 0 }}
            animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1 }}
          />

          <motion.div
            className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20"
            initial={{ y: 50, opacity: 0 }}
            animate={phase >= 5 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div>
                <div className="text-white font-bold text-xl">Quercia Rossa</div>
                <div className="text-white/60">Verificato dall'AI • Parco Nord</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

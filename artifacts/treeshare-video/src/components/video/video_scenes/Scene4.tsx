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
      className="absolute inset-0 flex items-center px-[10vw]"
      initial={{ clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)' }}
      animate={{ clipPath: 'polygon(0% 0, 100% 0, 100% 100%, 0% 100%)' }}
      exit={{ opacity: 0, y: -50 }}
      transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="w-1/2 relative z-10 h-[70vh]">
        <motion.div
          className="w-full h-full rounded-[2rem] overflow-hidden border border-white/20 relative shadow-2xl"
          initial={{ opacity: 0, x: -100, rotate: -5 }}
          animate={phase >= 1 ? { opacity: 1, x: 0, rotate: 0 } : { opacity: 0, x: -100, rotate: -5 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <img src={`${import.meta.env.BASE_URL}images/business-green.jpg`} alt="Business" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
          
          <motion.div 
            className="absolute bottom-8 left-8 right-8 p-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20"
            initial={{ opacity: 0, y: 30 }}
            animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold">Campagna Sostenibilità 2025</span>
              <span className="text-accent font-bold">€15.000</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: "0%" }}
                animate={phase >= 4 ? { width: "75%" } : { width: "0%" }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="w-1/2 pl-16 z-10">
        <motion.div 
          className="inline-block px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm font-bold tracking-wide mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        >
          PER LE AZIENDE
        </motion.div>
        
        <motion.h2 
          className="text-[4vw] font-display font-bold leading-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8 }}
        >
          La responsabilità sociale, <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-yellow-400">certificata.</span>
        </motion.h2>
        
        <motion.p
          className="text-[1.5vw] text-white/70 font-light mb-8"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          Le organizzazioni con Partita IVA possono lanciare campagne ambientali a pagamento, con trasparenza totale e impatto misurabile.
        </motion.p>
      </div>
    </motion.div>
  );
}

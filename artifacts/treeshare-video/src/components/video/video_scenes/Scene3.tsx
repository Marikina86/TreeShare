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

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: '0%' }}
      exit={{ opacity: 0, scale: 1.2, filter: 'blur(20px)' }}
      transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
    >
      <div className="absolute inset-0 z-0">
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/community.jpg`} 
          alt="Community" 
          className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          initial={{ scale: 1 }}
          animate={{ scale: 1.1 }}
          transition={{ duration: 4, ease: "linear" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-bg-dark/90" />
      </div>

      <div className="relative z-10 w-full px-[10vw] flex flex-col items-center text-center">
        <motion.h2 
          className="text-[5vw] font-display font-bold leading-tight mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          Adotta. Partecipa. <br/><span className="text-primary">Impatta.</span>
        </motion.h2>

        <div className="grid grid-cols-3 gap-8 w-full">
          {[
            { title: "Adozioni", desc: "Sostieni progetti a distanza", icon: "🌱" },
            { title: "Eventi", desc: "Partecipa ad azioni locali", icon: "📅" },
            { title: "Community", desc: "Connettiti con eco-warriors", icon: "🤝" }
          ].map((item, i) => (
            <motion.div
              key={i}
              className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md"
              initial={{ opacity: 0, y: 50 }}
              animate={phase >= i + 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
              transition={{ type: "spring", bounce: 0.3 }}
            >
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
              <p className="text-white/60">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { open: 4000, map: 4000, community: 4000, orgs: 4500, close: 4500 };

const scenePos = [
  { x: '45vw', y: '40vh', scale: 2.5, opacity: 0.7 },
  { x: '8vw',  y: '15vh', scale: 1,   opacity: 0.7 },
  { x: '75vw', y: '50vh', scale: 1.4, opacity: 0.5 },
  { x: '20vw', y: '70vh', scale: 0.8, opacity: 0.6 },
  { x: '60vw', y: '25vh', scale: 1.8, opacity: 0.3 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg-dark text-white">
      {/* Persistent background layer */}
      <div className="absolute inset-0">
        <img 
          src={`${import.meta.env.BASE_URL}images/forest-bg.jpg`} 
          alt="Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-overlay"
        />
        <motion.div className="absolute w-[800px] h-[800px] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #15803d, transparent)' }}
          animate={{ x: ['-10%', '60%', '20%'], y: ['10%', '50%', '30%'], scale: [1, 1.3, 0.9] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-3xl right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #d97706, transparent)' }}
          animate={{ x: ['10%', '-40%', '5%'], y: ['-10%', '-50%', '-20%'] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

      {/* Persistent midground layer */}
      <motion.div
        className="absolute w-40 h-40 rounded-full bg-primary/40 blur-xl"
        animate={scenePos[currentScene]}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.div
        className="absolute h-[2px] bg-accent"
        animate={{
          left: ['25%', '5%', '55%', '35%', '15%'][currentScene],
          width: ['50%', '90%', '25%', '60%', '40%'][currentScene],
          top: ['52%', '12%', '88%', '30%', '70%'][currentScene],
          opacity: currentScene >= 3 ? 0.6 : 0.9,
        }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="absolute w-24 h-24 border border-white/10 rounded-2xl backdrop-blur-sm bg-white/5"
        animate={{
          x: ['70vw', '85vw', '10vw', '50vw', '30vw'][currentScene],
          y: ['20vh', '60vh', '30vh', '10vh', '75vh'][currentScene],
          rotate: [0, 45, 90, 135, 180][currentScene],
          scale: [1, 1.2, 1.5, 0.8, 1.2][currentScene],
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="open" />}
        {currentScene === 1 && <Scene2 key="map" />}
        {currentScene === 2 && <Scene3 key="community" />}
        {currentScene === 3 && <Scene4 key="orgs" />}
        {currentScene === 4 && <Scene5 key="close" />}
      </AnimatePresence>
    </div>
  );
}

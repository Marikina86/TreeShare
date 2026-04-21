import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { open: 5000, map: 5000, community: 5000, orgs: 5500, close: 5500 };

const scenePos = [
  { x: '45vw', y: '40vh', scale: 2.5, opacity: 0.5 },
  { x: '8vw',  y: '15vh', scale: 1,   opacity: 0.5 },
  { x: '75vw', y: '50vh', scale: 1.4, opacity: 0.4 },
  { x: '20vw', y: '70vh', scale: 0.8, opacity: 0.4 },
  { x: '60vw', y: '25vh', scale: 1.8, opacity: 0.3 },
];

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-bg-dark text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-green-950 via-slate-900 to-emerald-950" />
        <motion.div
          className="absolute w-[900px] h-[900px] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, #15803d, transparent)' }}
          animate={{ x: ['-10%', '60%', '20%'], y: ['10%', '50%', '30%'], scale: [1, 1.3, 0.9] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full opacity-15 blur-3xl right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #d97706, transparent)' }}
          animate={{ x: ['10%', '-40%', '5%'], y: ['-10%', '-50%', '-20%'] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-3xl left-1/3 top-1/4"
          style={{ background: 'radial-gradient(circle, #065f46, transparent)' }}
          animate={{ x: ['0%', '30%', '-20%'], y: ['0%', '-30%', '20%'] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <motion.div
        className="absolute w-40 h-40 rounded-full bg-primary/30 blur-2xl"
        animate={scenePos[currentScene]}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
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

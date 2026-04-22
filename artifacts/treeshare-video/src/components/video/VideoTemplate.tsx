import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = { open: 5000, map: 5000, community: 5000, orgs: 5500, close: 5500 };
const TOTAL_DURATION = Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0);

const scenePos = [
  { x: '45vw', y: '40vh', scale: 2.5, opacity: 0.5 },
  { x: '8vw',  y: '15vh', scale: 1,   opacity: 0.5 },
  { x: '75vw', y: '50vh', scale: 1.4, opacity: 0.4 },
  { x: '20vw', y: '70vh', scale: 0.8, opacity: 0.4 },
  { x: '60vw', y: '25vh', scale: 1.8, opacity: 0.3 },
];

type RecordStatus = 'idle' | 'waiting' | 'recording' | 'done' | 'error';

function RecordPanel({ onRestart }: { onRestart: () => void }) {
  const [status, setStatus] = useState<RecordStatus>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleRecord = useCallback(async () => {
    setStatus('waiting');
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
        // @ts-ignore – Chrome-only hint to prefer current tab
        preferCurrentTab: true,
      });

      const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm'
        : 'video/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `treeshare-presentazione.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((t) => t.stop());
        setStatus('done');
      };

      // Register stop hook used by useVideoPlayer
      window.stopRecording = () => {
        if (recorder.state === 'recording') recorder.stop();
      };

      recorder.start(500);
      setStatus('recording');

      // Restart video from scene 1
      onRestart();

      // Safety fallback: stop after total duration + 2s buffer
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, TOTAL_DURATION + 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [onRestart]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3">
      {status === 'idle' && (
        <button
          onClick={handleRecord}
          className="flex items-center gap-2 px-5 py-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-white font-semibold text-sm hover:bg-black/90 transition-colors"
        >
          <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
          Registra video
        </button>
      )}
      {status === 'waiting' && (
        <div className="px-5 py-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-white/70 text-sm">
          Seleziona questa scheda nel browser…
        </div>
      )}
      {status === 'recording' && (
        <div className="flex items-center gap-2 px-5 py-3 bg-black/70 backdrop-blur-md border border-red-500/40 rounded-full text-white text-sm">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse inline-block" />
          Registrazione in corso — attendere la fine
        </div>
      )}
      {status === 'done' && (
        <div className="px-5 py-3 bg-black/70 backdrop-blur-md border border-green-500/40 rounded-full text-green-400 text-sm font-semibold">
          ✓ Video scaricato
        </div>
      )}
      {status === 'error' && (
        <div className="px-5 py-3 bg-black/70 backdrop-blur-md border border-red-500/40 rounded-full text-red-400 text-sm">
          Accesso negato — riprova
        </div>
      )}
    </div>
  );
}

function VideoPlayer() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <>
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
    </>
  );
}

export default function VideoTemplate() {
  const [videoKey, setVideoKey] = useState(0);
  const restart = useCallback(() => setVideoKey((k) => k + 1), []);

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
      </div>

      <VideoPlayer key={videoKey} />
      <RecordPanel onRestart={restart} />
    </div>
  );
}

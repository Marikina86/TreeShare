import logoPng from '@assets/1775373174085_1776790641065.png';

export default function Slide6() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d1f12 0%, #0f2a1a 50%, #0d1f12 100%)' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(34,197,94,0.10) 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center text-center px-[10vw]">
        <div className="w-[9vw] h-[9vw] rounded-[1.8vw] overflow-hidden mb-[4vh] shadow-2xl" style={{ border: '0.2vw solid rgba(34,197,94,0.3)' }}>
          <img src={logoPng} crossOrigin="anonymous" alt="TreeShare" className="w-full h-full object-cover" />
        </div>

        <p className="font-body text-muted font-medium uppercase tracking-widest mb-[2vh]" style={{ fontSize: '1.6vw' }}>
          Inizia subito
        </p>

        <h2 className="font-display font-black text-text leading-none tracking-tight mb-[2vh]" style={{ fontSize: '6.5vw' }}>
          treeshareapp.com
        </h2>

        <div className="w-[10vw] h-[0.2vh] mb-[3vh] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #d97706, transparent)' }} />

        <p className="font-body text-muted" style={{ fontSize: '2vw' }}>
          Scarica direttamente dal browser — nessun app store.
        </p>
      </div>
    </div>
  );
}

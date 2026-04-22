import logoPng from '@assets/1775373174085_1776790641065.png';

export default function Slide1() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex flex-col items-center justify-center" style={{ background: 'linear-gradient(135deg, #0d1f12 0%, #0f2a1a 50%, #0d1f12 100%)' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(34,197,94,0.12) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-[30vh]" style={{ background: 'linear-gradient(to top, rgba(217,119,6,0.08), transparent)' }} />

      <div className="relative z-10 flex flex-col items-center text-center px-[8vw]">
        <div className="w-[12vw] h-[12vw] rounded-[2vw] overflow-hidden mb-[4vh] shadow-2xl" style={{ border: '0.2vw solid rgba(34,197,94,0.3)' }}>
          <img src={logoPng} crossOrigin="anonymous" alt="TreeShare" className="w-full h-full object-cover" />
        </div>

        <h1 className="font-display font-black text-text leading-none tracking-tight mb-[3vh]" style={{ fontSize: '9vw', textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
          TreeShare
        </h1>

        <div className="w-[8vw] h-[0.3vh] mb-[3vh] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #d97706, transparent)' }} />

        <p className="font-body text-muted font-medium" style={{ fontSize: '2.2vw' }}>
          La piattaforma sociale per il verde.
        </p>
      </div>

      <div className="absolute bottom-[4vh] right-[4vw] font-body text-muted/50 font-medium" style={{ fontSize: '1.5vw' }}>
        treeshareapp.com
      </div>
    </div>
  );
}

export default function Slide5() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex items-end pb-[10vh]" style={{ background: 'linear-gradient(135deg, #0d1f12 0%, #0f2a1a 100%)' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 70% at 20% 50%, rgba(34,197,94,0.10) 0%, transparent 60%)' }} />
      <div className="absolute top-[5vh] right-[6vw] font-body text-muted/30 font-medium" style={{ fontSize: '1.5vw' }}>
        Ogni gesto conta
      </div>

      <div className="relative z-10 px-[8vw] w-full">
        <div className="w-[6vw] h-[0.4vh] mb-[4vh] rounded-full bg-primary" />
        <h2 className="font-display font-black text-text leading-none tracking-tighter" style={{ fontSize: '8vw', textWrap: 'balance' }}>
          Insieme,
        </h2>
        <h2 className="font-display font-black leading-none tracking-tighter text-primary" style={{ fontSize: '8vw' }}>
          cambiamo
        </h2>
        <h2 className="font-display font-black text-text leading-none tracking-tighter" style={{ fontSize: '8vw' }}>
          il pianeta.
        </h2>
        <p className="font-body text-muted mt-[3vh]" style={{ fontSize: '2vw' }}>
          Ogni albero piantato è un passo verso un futuro più verde.
        </p>
      </div>
    </div>
  );
}

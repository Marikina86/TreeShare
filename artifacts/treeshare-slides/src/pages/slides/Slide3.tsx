export default function Slide3() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #0d1f12 0%, #132b1a 60%, #0d1f12 100%)' }}>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,197,94,0.08) 0%, transparent 70%)' }} />

      <div className="relative z-10 flex flex-col items-center text-center px-[12vw]">
        <div className="w-[5vw] h-[0.3vh] mb-[5vh] rounded-full bg-accent" />

        <p className="font-display font-black italic text-text leading-tight" style={{ fontSize: '5.5vw', textWrap: 'balance' }}>
          "Ogni albero piantato,
          verificato e condiviso
          <span className="text-primary"> dalla community."</span>
        </p>

        <div className="mt-[5vh] flex items-center gap-[2vw]">
          <div className="w-[3vw] h-[0.15vh] bg-muted/40 rounded-full" />
          <p className="font-body text-muted font-medium" style={{ fontSize: '1.8vw' }}>
            Verifica intelligenza artificiale inclusa
          </p>
          <div className="w-[3vw] h-[0.15vh] bg-muted/40 rounded-full" />
        </div>
      </div>
    </div>
  );
}

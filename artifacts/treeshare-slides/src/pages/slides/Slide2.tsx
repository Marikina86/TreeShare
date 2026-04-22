export default function Slide2() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex flex-col justify-center px-[8vw]" style={{ background: 'linear-gradient(135deg, #0d1f12 0%, #0f2a1a 100%)' }}>
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />

      <div className="relative z-10">
        <p className="font-body text-primary font-semibold uppercase tracking-widest mb-[2vh]" style={{ fontSize: '1.5vw' }}>
          Come funziona
        </p>
        <h2 className="font-display font-black text-text leading-none tracking-tight mb-[6vh]" style={{ fontSize: '5.5vw' }}>
          Pianta. Mappa. Condividi.
        </h2>

        <div className="flex gap-[4vw]">
          <div className="flex-1">
            <div className="font-display font-black text-primary mb-[2vh]" style={{ fontSize: '5vw' }}>01</div>
            <h3 className="font-display font-bold text-text mb-[1.5vh]" style={{ fontSize: '2.5vw' }}>Pianta un albero</h3>
            <p className="font-body text-muted" style={{ fontSize: '1.8vw', lineHeight: '1.6' }}>
              Documenta ogni albero che pianti o adotti con foto e geolocalizzazione.
            </p>
          </div>
          <div className="w-[0.15vw] bg-primary/20 self-stretch" />
          <div className="flex-1">
            <div className="font-display font-black text-accent mb-[2vh]" style={{ fontSize: '5vw' }}>02</div>
            <h3 className="font-display font-bold text-text mb-[1.5vh]" style={{ fontSize: '2.5vw' }}>Verifica AI</h3>
            <p className="font-body text-muted" style={{ fontSize: '1.8vw', lineHeight: '1.6' }}>
              L'intelligenza artificiale verifica le tue foto e certifica la specie.
            </p>
          </div>
          <div className="w-[0.15vw] bg-primary/20 self-stretch" />
          <div className="flex-1">
            <div className="font-display font-black text-primary mb-[2vh]" style={{ fontSize: '5vw' }}>03</div>
            <h3 className="font-display font-bold text-text mb-[1.5vh]" style={{ fontSize: '2.5vw' }}>Condividi</h3>
            <p className="font-body text-muted" style={{ fontSize: '1.8vw', lineHeight: '1.6' }}>
              Ogni albero appare sulla mappa condivisa della community.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

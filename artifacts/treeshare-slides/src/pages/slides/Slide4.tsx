export default function Slide4() {
  return (
    <div className="w-screen h-screen overflow-hidden relative flex flex-col justify-center px-[8vw]" style={{ background: 'linear-gradient(135deg, #0d1f12 0%, #0f2a1a 100%)' }}>
      <div className="absolute bottom-0 left-0 w-[50vw] h-[50vh] opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #d97706, transparent)' }} />

      <div className="relative z-10">
        <h2 className="font-display font-black text-text leading-none tracking-tight mb-[6vh]" style={{ fontSize: '5.5vw' }}>
          Adotta. Partecipa. <span className="text-primary">Impatta.</span>
        </h2>

        <div className="flex gap-[3vw]">
          <div className="flex-1 rounded-[1.5vw] p-[3vw]" style={{ background: 'rgba(34,197,94,0.06)', border: '0.1vw solid rgba(34,197,94,0.15)' }}>
            <div className="w-[4vw] h-[4vw] rounded-full bg-primary/15 flex items-center justify-center mb-[2vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" style={{ width: '2.2vw', height: '2.2vw' }}>
                <path d="M12 22c0 0-8-4.5-8-11.5A8 8 0 0 1 12 2a8 8 0 0 1 8 8.5c0 7-8 11.5-8 11.5z" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-text mb-[1.5vh]" style={{ fontSize: '2.3vw' }}>Adozioni</h3>
            <p className="font-body text-muted" style={{ fontSize: '1.7vw', lineHeight: '1.6' }}>
              Sostieni alberi esistenti a distanza, seguendone la crescita nel tempo.
            </p>
          </div>

          <div className="flex-1 rounded-[1.5vw] p-[3vw]" style={{ background: 'rgba(217,119,6,0.06)', border: '0.1vw solid rgba(217,119,6,0.15)' }}>
            <div className="w-[4vw] h-[4vw] rounded-full bg-accent/15 flex items-center justify-center mb-[2vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" style={{ width: '2.2vw', height: '2.2vw' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-text mb-[1.5vh]" style={{ fontSize: '2.3vw' }}>Eventi</h3>
            <p className="font-body text-muted" style={{ fontSize: '1.7vw', lineHeight: '1.6' }}>
              Partecipa ad azioni locali di piantumazione organizzate dalla community.
            </p>
          </div>

          <div className="flex-1 rounded-[1.5vw] p-[3vw]" style={{ background: 'rgba(34,197,94,0.06)', border: '0.1vw solid rgba(34,197,94,0.15)' }}>
            <div className="w-[4vw] h-[4vw] rounded-full bg-primary/15 flex items-center justify-center mb-[2vh]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary" style={{ width: '2.2vw', height: '2.2vw' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h3 className="font-display font-bold text-text mb-[1.5vh]" style={{ fontSize: '2.3vw' }}>Community</h3>
            <p className="font-body text-muted" style={{ fontSize: '1.7vw', lineHeight: '1.6' }}>
              Connettiti con persone che condividono la passione per il verde.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

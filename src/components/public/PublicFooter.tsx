import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer className="bg-[#111111] border-t border-[#262626] pt-14 pb-12 mt-16 relative z-20 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white via-[#E11D2F] to-white opacity-60"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-8 mb-12">
          {/* Columna 1: Identidad Cine Tradicional */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <img
                src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmU78ReuLCf8T4T3Rv6K8-yAB13kXuZX7_TQ&s"
                alt="Jilotepec"
                className="w-11 h-11 rounded-full object-cover border border-white/10 shadow-lg grayscale hover:grayscale-0 transition-all duration-500"
              />
              <div className="flex flex-col">
                <h2 className="text-2xl font-serif font-black tracking-widest uppercase leading-none text-white">
                  Xilotzin
                </h2>
                <span className="text-[9px] font-sans font-bold tracking-[0.3em] text-[#E11D2F] uppercase mt-1">
                  Cine Tradicional
                </span>
              </div>
            </div>
            <p className="text-[#a3a3a3] text-xs font-sans leading-relaxed mt-2 pr-4 font-medium">
              El último gran refugio del séptimo arte en Jilotepec, Estado de México. Pantalla gigante, sonido digital y ecosistema digital sin complicaciones.
            </p>
          </div>

          {/* Columna 2: Navegación Rápida */}
          <div>
            <h3 className="text-white font-sans font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <svg aria-hidden="true" className="w-4 h-4 text-[#E11D2F]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Navegación Rápida
            </h3>
            <ul className="flex flex-col gap-3 text-xs font-sans uppercase tracking-wider font-bold text-[#a3a3a3]">
              <li>
                <a href="#cartelera" className="hover:text-white transition-colors flex items-center gap-2">
                  <span className="text-[#E11D2F]">›</span> Cartelera
                </a>
              </li>
              <li>
                <a href="#promociones" className="hover:text-white transition-colors flex items-center gap-2">
                  <span className="text-[#E11D2F]">›</span> Dulcería & Combos
                </a>
              </li>
              <li>
                <a href="#promociones" className="hover:text-white transition-colors flex items-center gap-2">
                  <span className="text-[#E11D2F]">›</span> Pre-orden con QR
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-white transition-colors flex items-center gap-2">
                  <span>›</span> Acceso Sistema POS
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Ubicación */}
          <div>
            <h3 className="text-white font-sans font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <svg aria-hidden="true" className="w-4 h-4 text-[#E11D2F]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Ubicación
            </h3>
            <ul className="flex flex-col gap-4 text-xs font-sans text-[#a3a3a3] font-medium">
              <li className="flex items-start gap-3">
                <i className="fa-solid fa-location-dot text-[#E11D2F] text-sm shrink-0" />
                <span className="leading-relaxed">
                  Centro de Jilotepec<br />Estado de México, C.P. 54240
                </span>
              </li>
              <li className="flex items-center gap-3">
                <i className="fa-solid fa-phone text-[#E11D2F] text-sm shrink-0" />
                <span>Atención: +52 (55) 1234 5678</span>
              </li>
            </ul>
          </div>

          {/* Columna 4: Redes & Promoción */}
          <div>
            <h3 className="text-white font-sans font-bold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
              <span className="text-[#E11D2F] font-bold">#</span> Redes & Promoción
            </h3>
            <div className="flex gap-3 mb-6">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#050505] border border-[#262626] flex items-center justify-center text-[#a3a3a3] hover:text-white hover:border-[#E11D2F] transition-all shadow-lg text-xs font-bold"
                aria-label="Facebook"
              >
                FB
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#050505] border border-[#262626] flex items-center justify-center text-[#a3a3a3] hover:text-white hover:border-[#E11D2F] transition-all shadow-lg text-xs font-bold"
                aria-label="Instagram"
              >
                IG
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#050505] border border-[#262626] flex items-center justify-center text-[#a3a3a3] hover:text-white hover:border-[#E11D2F] transition-all shadow-lg text-xs font-bold"
                aria-label="TikTok"
              >
                TK
              </a>
            </div>
            <span className="inline-block bg-[#050505] px-3 py-1.5 rounded-lg border border-[#262626] text-[10px] text-[#737373] font-mono">
              PWA v1.0 • Cine Xilotzin
            </span>
          </div>
        </div>

        {/* Barra Inferior */}
        <div className="border-t border-[#262626] pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-[#a3a3a3]/60 text-[10px] font-sans font-bold uppercase tracking-[0.2em]">
            &copy; 2026 Cine Teatro Xilotzin. Desarrollado por Rodnix.
          </p>
          <p className="text-[#a3a3a3]/50 text-[9px] font-sans font-bold uppercase tracking-[0.3em] flex items-center gap-1.5">
            Hecho con <i className="fa-solid fa-heart text-[#E11D2F] mx-1" /> en Jilotepec, Edo. Méx.
          </p>
        </div>
      </div>
    </footer>
  );
}

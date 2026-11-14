'use client';

import { useState, useEffect } from 'react';
import { Movie } from '@/types/cartelera';

interface MovieCardProps {
  readonly movie: Movie;
  readonly onSelect: (movie: Movie) => void;
}

interface ThemeBadgeConfig {
  label: string;
  icon: string;
}

const THEME_BADGES: Record<string, ThemeBadgeConfig> = {
  traditional: { label: 'Clásico', icon: 'fa-solid fa-film' },
  halloween: { label: 'Terror VIP', icon: 'fa-solid fa-ghost' },
  christmas: { label: 'Navideño', icon: 'fa-solid fa-snowflake' },
  mexican: { label: 'Gala Patria', icon: 'fa-solid fa-flag' },
};

export default function MovieCard({ movie, onSelect }: MovieCardProps) {
  const [activeTheme, setActiveTheme] = useState<string>('traditional');

  useEffect(() => {
    const updateTheme = () => {
      if (typeof document === 'undefined') return;
      const themeKey = document.documentElement.dataset.cineTheme || '';
      if (themeKey.includes('halloween')) {
        setActiveTheme('halloween');
      } else if (themeKey.includes('christmas')) {
        setActiveTheme('christmas');
      } else if (themeKey.includes('mexican') || themeKey.includes('patrias')) {
        setActiveTheme('mexican');
      } else {
        setActiveTheme('traditional');
      }
    };

    updateTheme();
    window.addEventListener('xilotzin_theme_change', updateTheme);

    return () => {
      window.removeEventListener('xilotzin_theme_change', updateTheme);
    };
  }, []);

  const badgeConfig = THEME_BADGES[activeTheme] || THEME_BADGES.traditional;

  return (
    <article className="public-theme-card group relative rounded-2xl overflow-hidden bg-[#121212] border border-[#262626] hover:border-[#E11D2F]/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(225,29,47,0.25)] flex flex-col">
      {/* Portada limpia de película (Aspect 2/3 exacto a la maqueta) */}
      <button
        type="button"
        onClick={() => onSelect(movie)}
        className="aspect-[2/3] w-full relative bg-black cursor-pointer overflow-hidden p-0 border-none text-left focus:outline-none focus:ring-2 focus:ring-[#E11D2F]"
        aria-label={`Ver sinopsis y horarios de ${movie.title}`}
      >
        {/* Póster de la película */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={movie.posterUrl}
          alt={movie.title}
          loading="lazy"
          className="object-cover w-full h-full opacity-85 group-hover:opacity-100 group-hover:scale-105 transition duration-500"
        />

        {/* Gradiente inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent pointer-events-none" />

        {/* Badge temático estacional (Esquina superior izquierda) */}
        <div className="theme-card-badge flex items-center gap-1.5 pointer-events-none">
          <i className={`${badgeConfig.icon} text-[9px]`} aria-hidden="true" />
          <span>{badgeConfig.label}</span>
        </div>

        {/* Badge de clasificación oficial (Esquina superior derecha) */}
        <div className="absolute top-3.5 right-3.5 bg-[#E11D2F] text-white font-black text-xs px-2.5 py-1 rounded shadow-lg z-10 border border-white/20">
          Clasif. {movie.classification}
        </div>

        {/* Hover overlay cinematográfico con blur */}
        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 backdrop-blur-[2px]">
          <span className="bg-white text-black px-5 py-2.5 font-sans font-bold uppercase text-xs tracking-widest shadow-2xl rounded-full flex items-center gap-2 transform group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-eye text-[#E11D2F]" aria-hidden="true" />
            Ver Sinopsis y Horarios
          </span>
          <span className="text-[10px] text-white/80 uppercase font-sans font-bold tracking-widest mt-3">
            {movie.duration} • {movie.genre}
          </span>
        </div>
      </button>

      {/* Ficha informativa limpia */}
      <div className="p-5 flex flex-col flex-grow justify-between bg-[#121212]/90">
        <div>
          <h3
            className="text-xl font-['Playfair_Display',serif] font-black uppercase mb-1 text-white leading-tight group-hover:text-[#E11D2F] transition-colors line-clamp-1"
            title={movie.title}
          >
            <button
              type="button"
              onClick={() => onSelect(movie)}
              className="text-left w-full hover:text-[#E11D2F] transition-colors"
            >
              {movie.title}
            </button>
          </h3>
          <p className="text-[#A0A0A0] text-xs font-sans font-semibold uppercase tracking-wider mb-4">
            {movie.genre} • {movie.duration}
          </p>
        </div>

        <div className="pt-3 border-t border-[#262626] flex items-center justify-between">
          <button
            type="button"
            onClick={() => onSelect(movie)}
            className="w-full bg-white/5 hover:bg-[#E11D2F] text-white hover:text-white border border-white/10 hover:border-[#E11D2F] font-sans font-bold py-2.5 px-4 rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-calendar-days" aria-hidden="true" />
            Consultar Horarios y Pre-orden
          </button>
        </div>
      </div>
    </article>
  );
}

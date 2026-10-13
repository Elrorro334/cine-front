'use client';

import { Movie } from '@/types/cartelera';

interface MovieCardProps {
  readonly movie: Movie;
  readonly onSelect: (movie: Movie) => void;
}

function getClassificationBadgeColor(classification: string): string {
  switch (classification.toUpperCase()) {
    case 'AA':
    case 'A':
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-800';
    case 'B':
      return 'bg-blue-950/80 text-blue-400 border-blue-800';
    case 'B15':
      return 'bg-amber-950/80 text-amber-400 border-amber-800';
    case 'C':
    case 'D':
      return 'bg-red-950/80 text-red-400 border-red-800';
    default:
      return 'bg-neutral-900 text-neutral-300 border-neutral-700';
  }
}

export default function MovieCard({ movie, onSelect }: MovieCardProps) {
  const badgeColor = getClassificationBadgeColor(movie.classification);

  return (
    <article className="group bg-[#111111] border border-[#262626] rounded-2xl overflow-hidden flex flex-col hover:border-[#D81B60]/70 hover:shadow-xl hover:shadow-[#D81B60]/10 transition-all duration-300">
      {/* Poster Clickable Button */}
      <button
        type="button"
        onClick={() => onSelect(movie)}
        className="relative aspect-[2/3] w-full overflow-hidden cursor-pointer bg-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#D81B60] block p-0 border-none text-left"
        aria-label={`Ver ficha técnica de ${movie.title}`}
      >
        {/* Poster Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={movie.posterUrl}
          alt={`Póster de la película ${movie.title}`}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-transparent to-black/30 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-lg border text-[11px] font-mono font-black uppercase shadow-md ${badgeColor}`}
          >
            Clasif. {movie.classification}
          </span>
          {movie.rating && (
            <span className="px-2 py-0.5 rounded-lg bg-black/70 backdrop-blur-sm border border-amber-500/40 text-amber-400 text-[11px] font-mono font-bold flex items-center gap-1 shadow-md">
              ★ {movie.rating}
            </span>
          )}
        </div>

        {/* Floating Quick Action Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 backdrop-blur-[2px]">
          <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D81B60] to-[#F57C00] text-white text-xs font-black uppercase tracking-wider shadow-lg transform -translate-y-2 group-hover:translate-y-0 transition-transform">
            Conocer más
          </span>
        </div>
      </button>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-grow justify-between space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase font-bold text-[#a3a3a3] mb-1">
            <span className="truncate">{movie.genre}</span>
            <span className="font-mono text-neutral-400 shrink-0">{movie.duration}</span>
          </div>

          <h3 className="font-['Playfair_Display',serif] text-base sm:text-lg font-black text-white line-clamp-1">
            <button
              type="button"
              onClick={() => onSelect(movie)}
              className="hover:text-[#D81B60] transition-colors text-left"
            >
              {movie.title}
            </button>
          </h3>
        </div>

        {/* Showtimes Preview */}
        <div className="pt-2 border-t border-[#262626]">
          <span className="text-[10px] font-bold uppercase text-[#a3a3a3] block mb-2">
            Horarios de Hoy:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {movie.showtimes.map((hora) => (
              <button
                key={hora}
                type="button"
                onClick={() => onSelect(movie)}
                className="px-2.5 py-1 rounded-md bg-[#050505] border border-[#262626] text-white hover:border-[#D81B60] hover:text-[#D81B60] text-xs font-mono font-bold transition-colors"
              >
                {hora}
              </button>
            ))}
          </div>
        </div>

        {/* Button */}
        <button
          type="button"
          onClick={() => onSelect(movie)}
          className="w-full mt-2 py-2 px-3 rounded-xl border border-[#262626] bg-[#1a1a1a] hover:bg-[#D81B60] hover:border-[#D81B60] text-white text-xs font-bold uppercase tracking-wider transition-all"
        >
          Conocer más
        </button>
      </div>
    </article>
  );
}

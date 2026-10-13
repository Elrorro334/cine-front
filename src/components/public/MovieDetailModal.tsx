'use client';

import { useState, useEffect } from 'react';
import { Movie } from '@/types/cartelera';

interface MovieDetailModalProps {
  readonly movie: Movie | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export default function MovieDetailModal({ movie, isOpen, onClose }: MovieDetailModalProps) {
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Evitar scroll en el fondo mientras el modal está abierto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !movie) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="movie-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md transition-opacity duration-300"
    >
      {/* Backdrop click to close */}
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onClose}
        className="fixed inset-0 bg-transparent cursor-default w-full h-full border-none p-0 -z-10 focus:outline-none"
      />

      {/* Modal Dialog Card */}
      <div className="relative z-10 w-full max-w-3xl bg-[#111111] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Backdrop / Close Button */}
        <div className="relative h-44 sm:h-56 w-full bg-neutral-900 shrink-0 overflow-hidden">
          {movie.backdropUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={movie.backdropUrl}
              alt=""
              className="w-full h-full object-cover opacity-40 scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-[#D81B60]/30 via-neutral-900 to-[#F57C00]/30" />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/60 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 border border-white/20 text-white hover:bg-[#D81B60] transition-colors flex items-center justify-center text-sm font-bold shadow-lg"
            aria-label="Cerrar ficha técnica"
          >
            ✕
          </button>

          {/* Badge Over Backing */}
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between gap-3">
            <span className="px-3 py-1 rounded-lg bg-[#D81B60] text-white text-[11px] font-mono font-black uppercase tracking-wider shadow-lg">
              Detalles y Horarios
            </span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-black/80 border border-amber-500/40 text-amber-400 text-xs font-mono font-bold">
                ★ {movie.rating || '8.5'}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-black/80 border border-white/20 text-white text-xs font-mono font-bold">
                {movie.duration}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Main Info */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Small poster thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-24 sm:w-28 aspect-[2/3] object-cover rounded-xl border border-[#262626] shadow-xl shrink-0 -mt-14 sm:-mt-16 relative z-10 hidden sm:block"
            />

            <div className="space-y-1.5 flex-grow">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800 text-[10px] font-mono font-bold uppercase">
                  Clasif. {movie.classification}
                </span>
                <span className="text-[11px] font-mono text-[#a3a3a3]">
                  {movie.allGenres || movie.genre}
                </span>
                {movie.releaseYear && (
                  <span className="text-[11px] font-mono text-[#a3a3a3]">
                    • {movie.releaseYear}
                  </span>
                )}
              </div>

              <h2
                id="movie-modal-title"
                className="font-['Playfair_Display',serif] text-2xl sm:text-3xl font-black text-white leading-tight"
              >
                {movie.title}
              </h2>

              {movie.tagline && (
                <p className="text-xs italic text-[#D81B60] font-medium">
                  &ldquo;{movie.tagline}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Sinopsis */}
          <div className="space-y-2 bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#a3a3a3]">
              Sinopsis
            </h3>
            <p className="text-xs sm:text-sm text-[#e5e5e5] leading-relaxed">
              {movie.synopsis}
            </p>
          </div>

          {/* Ficha Técnica: Director & Reparto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#0a0a0a] p-4 rounded-2xl border border-[#262626]">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#a3a3a3] block mb-0.5">
                Director:
              </span>
              <p className="font-bold text-white text-sm">
                {movie.director}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#a3a3a3] block mb-0.5">
                Reparto Principal:
              </span>
              <p className="text-neutral-300 text-xs">
                {movie.actors || 'Reparto oficial en cartelera'}
              </p>
            </div>
          </div>

          {/* Horarios Disponibles Hoy (Criterio 3) */}
          <div className="space-y-3 pt-2 border-t border-[#262626]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Horarios Disponibles para Hoy
              </h3>
              <span className="text-[10px] font-mono text-[#a3a3a3]">
                Sala 1 (Audio Envolvente)
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {movie.showtimes.map((hora) => {
                const isSelected = selectedHorario === hora;
                return (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => setSelectedHorario(hora)}
                    className={`py-3 px-3 rounded-xl font-mono text-sm font-bold border transition-all duration-200 flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#D81B60] to-[#F57C00] text-white border-transparent shadow-lg shadow-[#D81B60]/30 scale-105'
                        : 'bg-[#050505] text-[#f3f4f6] border-[#262626] hover:border-[#D81B60] hover:text-[#D81B60]'
                    }`}
                  >
                    <span>{hora}</span>
                    <span className="text-[9px] uppercase font-sans font-normal opacity-80">
                      {isSelected ? 'Seleccionado' : 'Disponible'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Aviso de selección */}
            {selectedHorario && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/60 to-black border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">✓ Horario elegido: {selectedHorario} hrs</span>
                  <span className="text-[11px] text-emerald-300 hidden sm:inline">
                    — Boletos en taquilla física a $50.00 MXN
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Función Activa
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#262626] bg-[#0a0a0a] flex items-center justify-between gap-3">
          <p className="text-[10px] text-[#a3a3a3] font-mono">
            Cine Teatro Xilotzin • Jilotepec, Edo. Méx.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#1f1f1f] hover:bg-neutral-700 text-white text-xs font-bold uppercase transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

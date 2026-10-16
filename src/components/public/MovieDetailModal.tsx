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
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#0A0A0A]/95 backdrop-blur-md transition-opacity duration-300"
    >
      {/* Backdrop click to close */}
      <button
        type="button"
        aria-label="Cerrar modal"
        onClick={onClose}
        className="fixed inset-0 bg-transparent cursor-default w-full h-full border-none p-0 -z-10 focus:outline-none"
      />

      {/* Modal Dialog Card (Diseño exacto Xilotzin) */}
      <div className="bg-[#121212] border border-[#262626] rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-y-auto relative shadow-2xl flex flex-col md:flex-row">
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 w-9 h-9 sm:w-10 sm:h-10 bg-[#0A0A0A] rounded-full flex items-center justify-center text-white hover:bg-[#E11D2F] hover:scale-110 transition-all z-20 shadow-lg border border-[#262626]"
          aria-label="Cerrar ficha técnica"
        >
          ✕
        </button>

        {/* Columna Izquierda: Póster con gradiente */}
        <div className="w-full md:w-[42%] relative h-64 sm:h-80 md:h-auto shrink-0 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent md:bg-gradient-to-r" />
        </div>

        {/* Columna Derecha: Ficha y Horarios */}
        <div className="w-full md:w-[58%] p-5 sm:p-8 md:p-10 flex flex-col relative z-10">
          {/* Cabecera */}
          <div className="mb-4">
            <span className="inline-block text-[10px] font-sans font-bold tracking-[0.2em] text-white bg-[#262626] px-3 py-1.5 rounded-full uppercase mb-3">
              {movie.genre || 'Cine'}
            </span>
            <h2
              id="movie-modal-title"
              className="text-2xl sm:text-3xl md:text-4xl font-['Playfair_Display',serif] font-black text-white uppercase leading-tight tracking-tight mb-2"
            >
              {movie.title}
            </h2>
            {movie.tagline && (
              <p className="text-xs sm:text-sm font-sans italic text-[#E11D2F] opacity-90 tracking-wide">
                &ldquo;{movie.tagline}&rdquo;
              </p>
            )}
          </div>

          {/* Badges Info */}
          <div className="flex flex-wrap items-center gap-2.5 mb-6 text-xs font-sans text-[#E0E0E0] uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5 bg-[#0A0A0A] px-3 py-1.5 rounded-md border border-[#262626]">
              ⏱ {movie.duration}
            </span>
            <span className="flex items-center gap-1.5 bg-[#0A0A0A] px-3 py-1.5 rounded-md border border-[#262626]">
              🏷 Clasif. {movie.classification}
            </span>
            <span className="flex items-center gap-1.5 bg-[#0A0A0A] px-3 py-1.5 rounded-md border border-[#262626]">
              ★ {movie.rating || '8.5'}/10
            </span>
          </div>

          {/* Horarios de Funciones Disponibles (Copiado de Xilotzin) */}
          <div className="mb-6 bg-[#0A0A0A]/70 p-4 rounded-xl border border-[#262626]">
            <h4 className="font-sans font-bold text-white uppercase tracking-widest text-xs mb-3 flex items-center justify-between">
              <span>🕒 Horarios Disponibles:</span>
              <span className="text-[10px] text-[#A0A0A0] font-normal">Acceso General ($50 MXN)</span>
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {movie.showtimes.map((hora) => {
                const isSelected = selectedHorario === hora;
                return (
                  <button
                    key={hora}
                    type="button"
                    onClick={() => setSelectedHorario(hora)}
                    className={`px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase transition-all ${
                      isSelected
                        ? 'bg-[#E11D2F] text-white shadow-lg shadow-[#E11D2F]/30 scale-105'
                        : 'bg-[#121212] border border-[#262626] text-white hover:border-[#E11D2F]'
                    }`}
                  >
                    {hora}
                  </button>
                );
              })}
            </div>
            {selectedHorario && (
              <p className="mt-3 text-xs text-emerald-400 font-sans font-semibold">
                ✓ Función seleccionada: {selectedHorario} hrs en Sala 1
              </p>
            )}
          </div>

          {/* Sinopsis Oficial */}
          <div className="mb-6 flex-grow">
            <h4 className="font-sans font-bold text-white uppercase tracking-widest text-xs mb-2">
              Sinopsis Oficial
            </h4>
            <p className="text-[#E0E0E0] leading-relaxed text-xs sm:text-sm font-sans font-medium mb-4">
              {movie.synopsis}
            </p>

            <div className="space-y-1.5 text-xs font-sans bg-[#0A0A0A]/50 p-4 rounded-xl border border-[#262626]/50">
              <p className="text-[#E0E0E0]">
                <span className="font-bold text-white uppercase tracking-widest mr-2">Director:</span>
                <span className="text-neutral-300">{movie.director}</span>
              </p>
              <p className="text-[#E0E0E0]">
                <span className="font-bold text-white uppercase tracking-widest mr-2">Elenco:</span>
                <span className="text-neutral-300">{movie.actors || 'Reparto oficial en cartelera'}</span>
              </p>
            </div>
          </div>

          {/* Botón de Acción */}
          <div className="mt-auto pt-4 border-t border-[#262626]">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-gradient-to-r from-[#E11D2F] to-red-700 text-white px-5 py-3.5 rounded-xl font-sans font-black text-xs uppercase tracking-widest hover:scale-[1.02] hover:shadow-[0_0_25px_rgba(225,29,47,0.45)] transition-all flex items-center justify-center gap-2 text-center leading-tight shadow-lg"
            >
              <span>Entendido • Regresar a Cartelera</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

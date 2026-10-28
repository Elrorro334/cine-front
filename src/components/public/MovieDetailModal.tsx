'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Movie } from '@/types/cartelera';

interface MovieDetailModalProps {
  readonly movie: Movie | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export default function MovieDetailModal({ movie, isOpen, onClose }: MovieDetailModalProps) {
  const router = useRouter();
  const [selectedHorarioOverride, setSelectedHorarioOverride] = useState<string | null>(null);

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

  const defaultHorario = movie.showtimes.length > 0 ? movie.showtimes[0] : null;
  const selectedHorario = selectedHorarioOverride ?? defaultHorario;

  const selectedFuncion = movie.funciones?.find((f) => f.hora === selectedHorario) ?? movie.funciones?.[0];
  const precioDisplay = selectedFuncion ? selectedFuncion.precio : 50;
  const salaDisplay = selectedFuncion?.nombreSala || 'Sala Principal';

  const handleGenerarPreorden = () => {
    onClose();
    const horarioParam = selectedHorario ? `&horario=${encodeURIComponent(selectedHorario)}` : '';
    router.push(`/preorden?peli=${movie.id}${horarioParam}`);
  };

  const handleVerTrailer = () => {
    const targetUrl = movie.trailerKey
      ? `https://www.youtube.com/watch?v=${movie.trailerKey}`
      : `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' trailer oficial')}`;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="movie-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-[#0A0A0A]/95 backdrop-blur-md transition-opacity duration-300 border-none m-0 max-w-none max-h-none w-full h-full"
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
          <i className="fa-solid fa-xmark text-lg" />
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
              <i className="fa-solid fa-clock text-[#E11D2F]" /> {movie.duration}
            </span>
            <span className="flex items-center gap-1.5 bg-[#0A0A0A] px-3 py-1.5 rounded-md border border-[#262626]">
              <i className="fa-solid fa-tag text-[#E11D2F]" /> Clasif. {movie.classification}
            </span>
            <span className="flex items-center gap-1.5 bg-[#0A0A0A] px-3 py-1.5 rounded-md border border-[#262626]">
              <i className="fa-solid fa-star text-yellow-400" /> {movie.rating || '8.5'}/10
            </span>
          </div>

          {/* Horarios de Funciones Disponibles (Dinámicos desde BD) */}
          <div className="mb-6 bg-[#0A0A0A]/70 p-4 rounded-xl border border-[#262626]">
            <h4 className="font-sans font-bold text-white uppercase tracking-widest text-xs mb-3 flex items-center justify-between">
              <span className="flex items-center gap-1.5"><i className="fa-solid fa-calendar-day text-[#E11D2F]" /> Horarios Disponibles:</span>
              <span className="text-[10px] text-[#A0A0A0] font-normal">Acceso General (${precioDisplay} MXN)</span>
            </h4>
            {movie.showtimes.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {movie.showtimes.map((hora) => {
                  const isSelected = selectedHorario === hora;
                  return (
                    <button
                      key={hora}
                      type="button"
                      onClick={() => setSelectedHorarioOverride(hora)}
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
            ) : (
              <p className="text-xs text-[#a3a3a3] italic">No hay funciones programadas para hoy.</p>
            )}
            {selectedHorario && (
              <p className="mt-3 text-xs text-emerald-400 font-sans font-semibold">
                <i className="fa-solid fa-circle-check text-emerald-400 mr-1.5" /> Función seleccionada: {selectedHorario} hrs en {salaDisplay}
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

          {/* Botones de Acción (Captura 1: Generar Pre-Orden y Ver Tráiler) */}
          <div className="mt-auto pt-4 border-t border-[#262626] flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={handleGenerarPreorden}
              className="flex-1 bg-[#E11D2F] hover:bg-[#c81928] text-white py-3.5 px-4 rounded-xl font-sans font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#E11D2F]/40 hover:scale-[1.01]"
            >
              <i className="fa-solid fa-qrcode text-sm" />
              <span>Generar Pre-Orden (Ticket QR)</span>
            </button>
            <button
              type="button"
              onClick={handleVerTrailer}
              className="bg-[#161616] hover:bg-[#222222] border border-[#333333] hover:border-neutral-500 text-white py-3.5 px-5 rounded-xl font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              <i className="fa-brands fa-youtube text-red-500 text-base" />
              <span>Ver Tráiler</span>
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

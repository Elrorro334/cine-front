'use client';

import React, { useState } from 'react';
import { carteleraService } from '@/services/carteleraService';
import { getPosterUrl } from '@/lib/tmdb';
import { TmdbSearchResultDto, TmdbMovieDetailDto } from '@/types/api';

interface TmdbRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMovieRegistered: () => void;
}

export default function TmdbRegisterModal({
  isOpen,
  onClose,
  onMovieRegistered,
}: TmdbRegisterModalProps) {
  const [query, setQuery] = useState('');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [registeringId, setRegisteringId] = useState<number | null>(null);

  const [results, setResults] = useState<TmdbSearchResultDto[]>([]);
  const [selectedMovieDetail, setSelectedMovieDetail] = useState<TmdbMovieDetailDto | null>(null);

  // Campos editables por película en los resultados preliminares
  const [customHorarios, setCustomHorarios] = useState<Record<number, string>>({});
  const [customPrecios, setCustomPrecios] = useState<Record<number, number>>({});
  const [customClasif, setCustomClasif] = useState<Record<number, string>>({});

  // Campos en la vista detallada
  const [detailHorario, setDetailHorario] = useState('16:00');
  const [detailPrecio, setDetailPrecio] = useState(50);
  const [detailIdSala, setDetailIdSala] = useState(1);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Paso 1: Búsqueda preliminar en TMDB
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    try {
      setLoadingSearch(true);
      setError(null);
      setFeedback(null);
      setSelectedMovieDetail(null);

      const data = await carteleraService.buscarTmdb(query.trim());
      setResults(data);

      if (data.length === 0) {
        setError('No se encontraron películas con ese término.');
      }
    } catch {
      setError('Error al consultar el catálogo de películas.');
    } finally {
      setLoadingSearch(false);
    }
  };

  // Paso 2: Obtener detalles completos de la película seleccionada
  const handleSelectMovie = async (movie: TmdbSearchResultDto) => {
    try {
      setLoadingDetail(true);
      setError(null);
      setFeedback(null);

      const detail = await carteleraService.obtenerDetalleTmdb(movie.tmdbId);
      setSelectedMovieDetail(detail);
    } catch {
      // Fallback a los datos preliminares si detalle profundo no responde
      setSelectedMovieDetail({
        tmdbId: movie.tmdbId,
        titulo: movie.titulo,
        tituloOriginal: movie.tituloOriginal,
        sinopsis: movie.sinopsis,
        duracion: 120,
        clasificacion: 'B',
        director: 'Director Oficial',
        actores: 'Reparto oficial',
        genero: 'Estreno',
        posterPath: movie.posterPath || movie.posterUrl || '',
        releaseYear: movie.releaseYear,
        rating: movie.rating,
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Registro directo desde tarjeta preliminar
  const handleRegisterDirect = async (movie: TmdbSearchResultDto) => {
    try {
      setRegisteringId(movie.tmdbId);
      setError(null);
      setFeedback(null);

      const horario = customHorarios[movie.tmdbId] || '18:00';
      const precio = customPrecios[movie.tmdbId] ?? 50;
      const clasificacion = customClasif[movie.tmdbId] || 'B';
      const posterRaw = movie.posterPath || movie.posterUrl || '';

      await carteleraService.registrarPelicula({
        titulo: movie.titulo,
        sinopsis: movie.sinopsis,
        posterPath: posterRaw,
        posterImage: movie.posterUrl || posterRaw,
        duracion: 120,
        clasificacion,
        director: 'Director Oficial',
        horario,
        precio,
      });

      setFeedback(`¡"${movie.titulo}" fue registrada exitosamente en la cartelera de hoy!`);
      onMovieRegistered();
    } catch {
      setError('No se pudo registrar la película en la base de datos.');
    } finally {
      setRegisteringId(null);
    }
  };

  // Confirmación desde ficha detallada
  const handleConfirmFromDetail = async () => {
    if (!selectedMovieDetail) return;

    try {
      setRegisteringId(selectedMovieDetail.tmdbId);
      setError(null);
      setFeedback(null);

      await carteleraService.registrarPelicula({
        titulo: selectedMovieDetail.titulo,
        sinopsis: selectedMovieDetail.sinopsis,
        duracion: selectedMovieDetail.duracion,
        clasificacion: selectedMovieDetail.clasificacion,
        director: selectedMovieDetail.director,
        posterPath: selectedMovieDetail.posterPath,
        posterImage: selectedMovieDetail.posterPath,
        precio: detailPrecio,
        horario: detailHorario,
        idSala: detailIdSala,
      });

      setFeedback(`¡"${selectedMovieDetail.titulo}" fue registrada exitosamente en la cartelera de hoy!`);
      setSelectedMovieDetail(null);
      setResults([]);
      setQuery('');
      onMovieRegistered();
    } catch {
      setError('No se pudo registrar la película en la base de datos.');
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#111111] border border-[#262626] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-['Montserrat',sans-serif]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#262626] flex items-center justify-between bg-[#161616]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E11D2F] to-[#800C16] flex items-center justify-center text-white shadow-md">
              <span className="text-sm">🎬</span>
            </div>
            <div>
              <h2 className="text-base font-black uppercase text-white tracking-wide">
                Registrar Película desde TMDB
              </h2>
              <p className="text-xs text-[#a3a3a3]">
                Búsqueda en catálogo oficial con descarga automática de carátula y sinopsis
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#262626] text-[#a3a3a3] hover:text-white hover:bg-[#333] transition flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Buscador */}
        <div className="p-5 border-b border-[#262626] bg-[#0c0c0c]">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe el nombre de la película (ej. Batman, Spiderman, Intensamente...)"
                className="w-full bg-[#161616] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#737373] focus:outline-none focus:border-[#E11D2F] transition"
              />
            </div>
            <button
              type="submit"
              disabled={loadingSearch || !query.trim()}
              className="bg-[#E11D2F] hover:bg-[#c81928] disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition flex items-center gap-2"
            >
              {loadingSearch ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {feedback && (
            <div className="mt-3 bg-emerald-950/60 border border-emerald-600/40 text-emerald-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <span>✓</span>
              <span>{feedback}</span>
            </div>
          )}

          {error && (
            <div className="mt-3 bg-red-950/60 border border-red-600/40 text-red-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Contenido Dinámico */}
        <div className="p-5 flex-grow overflow-y-auto">
          {/* Ficha Técnica Detallada si se seleccionó una película */}
          {selectedMovieDetail ? (
            <div className="bg-[#161616] border border-[#262626] rounded-2xl p-5 space-y-6">
              <div className="flex items-center justify-between border-b border-[#262626] pb-3">
                <span className="text-xs font-bold text-[#E11D2F] uppercase tracking-widest">
                  Ficha Técnica TMDB ID: {selectedMovieDetail.tmdbId}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMovieDetail(null)}
                  className="text-xs text-[#a3a3a3] hover:text-white underline"
                >
                  ← Volver a resultados
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-5">
                <div className="w-32 h-48 bg-black rounded-xl overflow-hidden flex-shrink-0 shadow-lg relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getPosterUrl(selectedMovieDetail.posterPath)}
                    alt={selectedMovieDetail.titulo}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-1.5 right-1.5 bg-[#E11D2F] text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow">
                    {selectedMovieDetail.clasificacion}
                  </span>
                </div>

                <div className="flex-grow space-y-2 text-xs">
                  <h3 className="text-xl font-['Playfair_Display',serif] font-black text-white uppercase">
                    {selectedMovieDetail.titulo}
                  </h3>
                  {selectedMovieDetail.tituloOriginal && selectedMovieDetail.tituloOriginal !== selectedMovieDetail.titulo && (
                    <p className="text-neutral-400 italic">
                      Título original: {selectedMovieDetail.tituloOriginal}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[11px] text-neutral-300 font-mono">
                    <span className="bg-[#262626] px-2 py-0.5 rounded">⏱ {selectedMovieDetail.duracion} min</span>
                    <span className="bg-[#262626] px-2 py-0.5 rounded">📅 {selectedMovieDetail.releaseYear}</span>
                    <span className="bg-[#262626] px-2 py-0.5 rounded">★ {selectedMovieDetail.rating}/10</span>
                    <span className="bg-[#262626] px-2 py-0.5 rounded">🎭 {selectedMovieDetail.genero}</span>
                  </div>
                  <p className="text-neutral-300 leading-relaxed pt-2 line-clamp-3">
                    {selectedMovieDetail.sinopsis || 'Sin sinopsis disponible.'}
                  </p>
                  <p className="text-neutral-400 pt-1">
                    <strong className="text-white">Director:</strong> {selectedMovieDetail.director} • <strong className="text-white">Reparto:</strong> {selectedMovieDetail.actores}
                  </p>
                </div>
              </div>

              <div className="bg-[#0c0c0c] p-4 rounded-xl border border-[#262626] space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Configuración de Exhibición en Sala:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Sala de Proyección</label>
                    <select
                      value={detailIdSala}
                      onChange={(e) => setDetailIdSala(parseInt(e.target.value, 10))}
                      className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-xs text-white"
                    >
                      <option value={1}>Sala 1 - Pantalla Principal MacroXE</option>
                      <option value={2}>Sala 2 - Sala Tradicional</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Horario de Inicio</label>
                    <input
                      type="time"
                      value={detailHorario}
                      onChange={(e) => setDetailHorario(e.target.value)}
                      className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-neutral-400 block mb-1">Precio General ($ MXN)</label>
                    <input
                      type="number"
                      value={detailPrecio}
                      onChange={(e) => setDetailPrecio(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#161616] border border-[#333] rounded-lg px-3 py-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedMovieDetail(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#262626] hover:bg-[#333] text-white text-xs font-bold uppercase transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={registeringId === selectedMovieDetail.tmdbId}
                  onClick={handleConfirmFromDetail}
                  className="flex-grow bg-gradient-to-r from-[#E11D2F] to-red-700 hover:opacity-95 text-white font-black py-2.5 px-4 rounded-xl text-xs uppercase tracking-widest transition shadow-lg disabled:opacity-50"
                >
                  {registeringId === selectedMovieDetail.tmdbId ? 'Guardando...' : 'Registrar en Cartelera'}
                </button>
              </div>
            </div>
          ) : (
            /* Resultados de búsqueda */
            <div className="space-y-4">
              {results.length === 0 && !loadingSearch && !error && (
                <div className="text-center py-12 text-[#737373]">
                  <p className="text-sm font-semibold">
                    Escribe el nombre de la película arriba para buscar títulos disponibles en TMDB.
                  </p>
                  <p className="text-xs text-[#525252] mt-1">
                    El servidor consultará la API y te mostrará opciones listas para registrar.
                  </p>
                </div>
              )}

              {loadingDetail && (
                <div className="text-center py-8 text-neutral-400">
                  <span className="text-sm">Obteniendo ficha técnica completa de TMDB...</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.map((movie) => {
                  const posterUrl = getPosterUrl(movie.posterPath || movie.posterUrl);
                  return (
                    <div
                      key={movie.tmdbId}
                      className="bg-[#161616] border border-[#262626] hover:border-[#383838] rounded-xl p-3 flex gap-3 transition"
                    >
                      {/* Poster */}
                      <div className="w-24 h-36 flex-shrink-0 bg-[#0a0a0a] rounded-lg overflow-hidden relative shadow">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={posterUrl}
                          alt={movie.titulo}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {movie.rating > 0 && (
                          <span className="absolute top-1 right-1 bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-amber-400">
                            ★ {movie.rating}
                          </span>
                        )}
                      </div>

                      {/* Detalles y Formulario de Función */}
                      <div className="flex-grow flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-black text-white uppercase leading-snug line-clamp-1">
                              {movie.titulo}
                            </h3>
                            {movie.releaseYear && (
                              <span className="text-[10px] bg-[#262626] text-[#a3a3a3] px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0">
                                {movie.releaseYear}
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-[#a3a3a3] line-clamp-2 mt-1 leading-relaxed">
                            {movie.sinopsis || 'Sin sinopsis disponible.'}
                          </p>
                        </div>

                        {/* Parámetros de función */}
                        <div className="mt-2 pt-2 border-t border-[#262626]/80 space-y-2">
                          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                            <div>
                              <label className="text-[#737373] block mb-0.5">Horario</label>
                              <input
                                type="time"
                                value={customHorarios[movie.tmdbId] || '18:00'}
                                onChange={(e) =>
                                  setCustomHorarios((prev) => ({ ...prev, [movie.tmdbId]: e.target.value }))
                                }
                                className="w-full bg-[#0a0a0a] border border-[#333] rounded px-1.5 py-1 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[#737373] block mb-0.5">Precio ($)</label>
                              <input
                                type="number"
                                value={customPrecios[movie.tmdbId] ?? 50}
                                onChange={(e) =>
                                  setCustomPrecios((prev) => ({
                                    ...prev,
                                    [movie.tmdbId]: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className="w-full bg-[#0a0a0a] border border-[#333] rounded px-1.5 py-1 text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[#737373] block mb-0.5">Clasif.</label>
                              <select
                                value={customClasif[movie.tmdbId] || 'B'}
                                onChange={(e) =>
                                  setCustomClasif((prev) => ({ ...prev, [movie.tmdbId]: e.target.value }))
                                }
                                className="w-full bg-[#0a0a0a] border border-[#333] rounded px-1.5 py-1 text-white"
                              >
                                <option value="AA">AA</option>
                                <option value="A">A</option>
                                <option value="B">B</option>
                                <option value="B15">B15</option>
                                <option value="C">C</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectMovie(movie)}
                              className="w-1/3 bg-[#262626] hover:bg-[#333] text-neutral-300 text-[10px] font-bold py-1.5 px-2 rounded-lg uppercase tracking-wide transition truncate"
                              title="Ver detalles completos de TMDB"
                            >
                              Ver Ficha
                            </button>
                            <button
                              type="button"
                              disabled={registeringId === movie.tmdbId}
                              onClick={() => handleRegisterDirect(movie)}
                              className="w-2/3 bg-gradient-to-r from-[#E11D2F] to-[#991B1B] hover:opacity-95 text-white font-bold py-1.5 px-3 rounded-lg text-xs uppercase tracking-wide transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {registeringId === movie.tmdbId ? 'Guardando...' : 'Registrar en Cartelera'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#262626] bg-[#161616] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="bg-[#262626] hover:bg-[#333] text-white text-xs font-bold uppercase px-4 py-2 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

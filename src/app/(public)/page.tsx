'use client';

import { useState, useEffect, useMemo } from 'react';
import PublicNavbar from '@/components/public/PublicNavbar';
import PromotionsBanner from '@/components/public/PromotionsBanner';
import MovieCard from '@/components/public/MovieCard';
import MovieDetailModal from '@/components/public/MovieDetailModal';
import { carteleraService } from '@/services/carteleraService';
import { Movie, Promotion } from '@/types/cartelera';

const CLASSIFICATIONS = ['Todas', 'AA', 'A', 'B', 'B15', 'C'] as const;

export default function PublicPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [promotions] = useState<Promotion[]>(() => carteleraService.getPromociones());
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('Todas');

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Cargar cartelera con detalles enriquecidos de TMDB
    let isMounted = true;
    async function loadCartelera() {
      try {
        setLoading(true);
        const data = await carteleraService.getCarteleraHoy();
        if (isMounted) {
          setMovies(data);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadCartelera();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleOpenDetail = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  const handleCloseDetail = () => {
    setIsModalOpen(false);
  };

  // Filtrado reactivo por título/género y clasificación
  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (movie.genre && movie.genre.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesClassification =
        selectedClassification === 'Todas' ||
        movie.classification.toUpperCase() === selectedClassification.toUpperCase();

      return matchesSearch && matchesClassification;
    });
  }, [movies, searchQuery, selectedClassification]);

  return (
    <div className="min-h-screen bg-[#080808] text-[#f3f4f6] font-['Montserrat',sans-serif] flex flex-col">
      {/* Barra de Navegación */}
      <PublicNavbar />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-10">
        {/* Banner de Promociones (Criterio 1: Miércoles 2x1 y avisos) */}
        <section aria-label="Promociones vigentes">
          <PromotionsBanner promotions={promotions} />
        </section>

        {/* Sección de Cartelera */}
        <section id="cartelera" className="space-y-6">
          {/* Encabezado y Filtros */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#262626]">
            <div>
              <div className="inline-flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#D81B60] mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Funciones de Hoy en Jilotepec
              </div>
              <h1 className="text-2xl sm:text-3xl font-['Playfair_Display',serif] font-black uppercase text-white tracking-wide">
                Películas en Exhibición
              </h1>
              <p className="text-xs text-[#a3a3a3]">
                Selecciona una película para consultar su sinopsis, duración, director y horarios disponibles.
              </p>
            </div>

            {/* Controles de Búsqueda y Clasificación */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Buscador */}
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar película..."
                  className="w-full sm:w-56 bg-[#121212] border border-[#262626] rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D81B60] transition-colors"
                  aria-label="Buscar película"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                    aria-label="Limpiar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filtros de Clasificación */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {CLASSIFICATIONS.map((c) => {
                  const isSelected = selectedClassification === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedClassification(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all shrink-0 ${
                        isSelected
                          ? 'bg-[#D81B60] text-white shadow-md'
                          : 'bg-[#121212] text-[#a3a3a3] border border-[#262626] hover:text-white'
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grilla de Películas (Responsive PWA: 1 col móvil, 2 tablet, 3-4 desktop) */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-[#111111] border border-[#262626] rounded-2xl p-4 space-y-4 animate-pulse"
                >
                  <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl" />
                  <div className="h-4 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                  <div className="h-8 bg-neutral-800 rounded w-full" />
                </div>
              ))}
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-[#111111] border border-[#262626] rounded-3xl p-8">
              <p className="text-base font-bold text-white uppercase">
                No se encontraron películas
              </p>
              <p className="text-xs text-[#a3a3a3] max-w-sm mx-auto">
                No hay títulos que coincidan con &ldquo;{searchQuery}&rdquo; en la clasificación seleccionada.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedClassification('Todas');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-[#1f1f1f] border border-[#262626] text-xs font-bold text-white hover:border-[#D81B60]"
              >
                Restablecer Filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredMovies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onSelect={handleOpenDetail}
                />
              ))}
            </div>
          )}
        </section>

        {/* Sección Informativa: El Cine */}
        <section id="nosotros" className="p-6 sm:p-8 rounded-3xl bg-[#111111] border border-[#262626] grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
          <div className="space-y-1">
            <h3 className="font-['Playfair_Display',serif] text-base font-black text-white uppercase">
              Ubicación y Taquilla
            </h3>
            <p className="text-xs text-[#a3a3a3]">
              Centro Histórico de Jilotepec, Estado de México. Frente al jardín principal.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-['Playfair_Display',serif] text-base font-black text-white uppercase">
              Precio General
            </h3>
            <p className="text-xs text-[#a3a3a3]">
              Boleto general a $50.00 MXN. Pregunta en taquilla por nuestras promociones de 2x1 los miércoles.
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="font-['Playfair_Display',serif] text-base font-black text-white uppercase">
              Dulcería Tradicional
            </h3>
            <p className="text-xs text-[#a3a3a3]">
              Palomitas recién hechas, nachos con queso artesanal, refrescos y pizzas completas o por rebanada.
            </p>
          </div>
        </section>
      </main>

      {/* Modal de Ficha Técnica (Criterios 2 y 3) */}
      <MovieDetailModal
        key={selectedMovie?.id}
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={handleCloseDetail}
      />

      {/* Footer */}
      <footer className="mt-12 border-t border-[#262626] bg-[#050505] py-8 text-center text-xs text-[#737373] space-y-2">
        <p className="font-bold text-[#a3a3a3]">
          Cine Teatro Xilotzin © 2026 • Todos los derechos reservados
        </p>
        <p className="text-[11px]">
          Sistema PWA Oficial • Jilotepec, Estado de México
        </p>
      </footer>
    </div>
  );
}

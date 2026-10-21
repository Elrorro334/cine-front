'use client';

import { useState, useEffect, useMemo } from 'react';
import PublicNavbar from '@/components/public/PublicNavbar';
import PromotionsBanner from '@/components/public/PromotionsBanner';
import MovieCard from '@/components/public/MovieCard';
import MovieDetailModal from '@/components/public/MovieDetailModal';
import PublicFooter from '@/components/public/PublicFooter';
import CinemaAmbientParticles from '@/components/public/CinemaAmbientParticles';
import { carteleraService } from '@/services/carteleraService';
import { Movie, Promotion } from '@/types/cartelera';

const CLASSIFICATIONS = ['Todas', 'AA', 'A', 'B', 'B15', 'C'] as const;

export default function PublicPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('Todas');

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [carteleraData, promoData] = await Promise.all([
          carteleraService.getCarteleraHoy(),
          carteleraService.getPromociones(),
        ]);
        if (isMounted) {
          setMovies(carteleraData);
          setPromotions(promoData);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

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
        movie.genre?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClassification =
        selectedClassification === 'Todas' ||
        movie.classification.toUpperCase() === selectedClassification.toUpperCase();

      return matchesSearch && matchesClassification;
    });
  }, [movies, searchQuery, selectedClassification]);

  const renderCarteleraGrid = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 pb-10">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-[#121212] border border-[#262626] rounded-2xl p-4 space-y-4 animate-pulse flex flex-col"
            >
              <div className="w-full aspect-[2/3] bg-neutral-900 rounded-xl" />
              <div className="h-4 bg-neutral-800 rounded w-3/4" />
              <div className="h-3 bg-neutral-800 rounded w-1/2" />
              <div className="h-8 bg-neutral-800 rounded w-full mt-auto" />
            </div>
          ))}
        </div>
      );
    }

    if (filteredMovies.length === 0) {
      return (
        <div className="py-16 text-center space-y-3 bg-[#121212] border border-[#262626] rounded-3xl p-8 max-w-lg mx-auto">
          <p className="text-base font-bold text-white uppercase">
            {searchQuery ? 'No se encontraron películas' : 'Cartelera del Día no disponible'}
          </p>
          <p className="text-xs text-[#A0A0A0]">
            {searchQuery
              ? `No hay títulos en cartelera que coincidan con "${searchQuery}".`
              : 'No hay funciones programadas para hoy en este momento en la base de datos.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedClassification('Todas');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-[#262626] text-xs font-bold text-white hover:bg-[#E11D2F] transition-colors"
            >
              Restablecer Filtros
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 pb-10">
        {filteredMovies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            onSelect={handleOpenDetail}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-['Montserrat',sans-serif] flex flex-col antialiased selection:bg-[#E11D2F] selection:text-white relative">
      {/* Fondo de Palomitas y Elementos de Cine en Movimiento */}
      <CinemaAmbientParticles />

      {/* Barra de Navegación Superior */}
      <PublicNavbar />

      {/* Hero Section con Fotografía Cinemática y Gradientes Atmosféricos (Exacto al Mockup) */}
      <section className="relative w-full h-[38vh] sm:h-[44vh] md:h-[52vh] flex items-center justify-center overflow-hidden bg-[#0A0A0A] border-b border-[#262626]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45 bg-fixed"
          style={{ backgroundImage: `url('/CINE.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#E11D2F]/25 via-transparent to-white/10" />

        <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center">
          <span className="bg-[#E11D2F]/30 border border-[#E11D2F]/50 text-white font-sans font-bold text-[9px] sm:text-[10px] md:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em] px-3 sm:px-4 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-4 shadow-lg flex items-center gap-2">
            <i className="fa-solid fa-star text-yellow-400 mr-1.5" /> Pantalla Gigante • Sonido Digital • Jilotepec
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-['Playfair_Display',serif] font-black uppercase tracking-tight text-white mb-2 sm:mb-3 leading-tight md:leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
            La Magia del <br />
            <span className="bg-gradient-to-r from-white to-[#E11D2F] bg-clip-text text-transparent">
              Cine Tradicional
            </span>
          </h1>
          <p className="text-white/90 text-[11px] sm:text-xs md:text-sm font-sans tracking-wider sm:tracking-widest uppercase max-w-xl mx-auto mt-1 sm:mt-2 font-bold leading-relaxed drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)]">
            Consulta cartelera oficial en tiempo real, genera tu Pre-orden con código QR y canjéala directamente en caja sin hacer fila.
          </p>
        </div>
      </section>

      {/* Sección de Avisos y Novedades del Cine (Banner de Promociones) */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-4 w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-sans font-bold uppercase tracking-[0.25em] text-[#A0A0A0] flex items-center gap-2">
            <i className="fa-solid fa-bullhorn text-[#E11D2F] mr-2" /> Avisos & Novedades del Cine
          </h2>
        </div>
        <PromotionsBanner promotions={promotions} />
      </section>

      {/* Main Content: Cartelera Inteligente (En Exhibición) */}
      <main className="flex-grow max-w-7xl mx-auto px-4 md:px-6 py-12 relative z-20 w-full space-y-10">
        <div className="flex flex-col items-center mb-10 relative text-center">
          <h2 className="text-3xl md:text-4xl font-['Playfair_Display',serif] font-black uppercase tracking-widest text-white z-10 relative inline-block">
            En Exhibición
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#E11D2F] rounded-full shadow-lg shadow-[#E11D2F]/50" />
          </h2>
          <p className="text-[#A0A0A0] text-xs font-sans uppercase tracking-[0.2em] font-semibold mt-6 max-w-md">
            Haz clic en cualquier película para ver sinopsis completa, ficha oficial, horarios y apartar tus accesos en Pre-orden.
          </p>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CLASSIFICATIONS.map((c) => {
              const isSelected = selectedClassification === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedClassification(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all shrink-0 ${
                    isSelected
                      ? 'bg-[#E11D2F] text-white shadow-md'
                      : 'bg-[#121212] text-[#A0A0A0] border border-[#262626] hover:text-white'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar título o género..."
              className="w-full bg-[#121212] text-white placeholder-[#737373] text-xs px-4 py-2.5 rounded-xl border border-[#262626] focus:border-[#E11D2F] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
        </div>

        {/* Render de la Cartelera (Grid o Estado Vacío) */}
        {renderCarteleraGrid()}
      </main>

      {/* Modal Ficha Técnica y Horarios */}
      <MovieDetailModal
        movie={selectedMovie}
        isOpen={isModalOpen}
        onClose={handleCloseDetail}
      />

      {/* Footer Oficial */}
      <PublicFooter />
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { carteleraService } from '@/services/carteleraService';
import { getPosterUrl } from '@/lib/tmdb';
import { Movie } from '@/types/cartelera';
import {
  TmdbSearchResultDto,
  TmdbMovieDetailDto,
  RegistrarPeliculaDto,
} from '@/types/api';
import FinancialDashboardView from '@/components/pos/FinancialDashboardView';

export default function DashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'finanzas' | 'cartelera'>('finanzas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Administrador');

  // Cartelera en SQL Server
  const [registeredMovies, setRegisteredMovies] = useState<Movie[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(false);

  // TMDB Search State
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [isSyncingBase, setIsSyncingBase] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResultDto[]>([]);
  const [selectedTmdbMovie, setSelectedTmdbMovie] = useState<TmdbMovieDetailDto | null>(null);

  // Helpers de fechas locales
  const getTodayString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFutureDateString = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Formulario de Registro: Datos TMDB (Completados automáticamente desde API)
  const [regTitulo, setRegTitulo] = useState('');
  const [regSinopsis, setRegSinopsis] = useState('');
  const [regDuracion, setRegDuracion] = useState(120);
  const [regClasif, setRegClasif] = useState('B');
  const [regDirector, setRegDirector] = useState('Director General');
  const [regPosterPath, setRegPosterPath] = useState('');

  // Configuración de Exhibición (Lo único editable por el usuario)
  const [regFechaInicio, setRegFechaInicio] = useState<string>(getTodayString);
  const [regFechaFin, setRegFechaFin] = useState<string>(() => getFutureDateString(7));
  const [regHorarios, setRegHorarios] = useState<string[]>(['16:00', '18:30']);
  const [customHorario, setCustomHorario] = useState('21:00');
  const [regSala, setRegSala] = useState<number>(1);
  const [regPrecio, setRegPrecio] = useState(50);
  const [isRegistering, setIsRegistering] = useState(false);

  const toggleHorario = (time: string) => {
    setRegHorarios((prev) => {
      if (prev.includes(time)) {
        if (prev.length <= 1) {
          showToast('Debes mantener al menos un horario de función.', 'error');
          return prev;
        }
        return prev.filter((h) => h !== time);
      } else {
        return [...prev, time].sort();
      }
    });
  };

  const handleAddCustomHorario = () => {
    if (!customHorario) return;
    if (regHorarios.includes(customHorario)) {
      showToast('Ese horario ya está seleccionado.', 'error');
      return;
    }
    setRegHorarios((prev) => [...prev, customHorario].sort());
    showToast(`Horario ${customHorario} agregado.`, 'success');
  };

  const handleRemoveHorario = (time: string) => {
    if (regHorarios.length <= 1) {
      showToast('Debes mantener al menos un horario de función.', 'error');
      return;
    }
    setRegHorarios((prev) => prev.filter((h) => h !== time));
  };

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Verificación de sesión y restricción estricta de Administrador (HU-10 Regla 1)
  useEffect(() => {
    const session = authService.getUserSession();
    if (!session) {
      router.push('/login');
      return;
    }
    const rolLower = session.rol?.toLowerCase() || '';
    if (!rolLower.includes('admin')) {
      // Acceso estrictamente restringido a rol Administrador
      router.push('/pos');
      return;
    }
    if (session.nombre) {
      setUserName(session.nombre);
    }
  }, [router]);

  // 2. Cargar películas existentes en SQL Server
  const loadActiveMovies = async () => {
    try {
      setLoadingRegistered(true);
      const data = await carteleraService.getCarteleraHoy();
      setRegisteredMovies(data);
    } catch {
      showToast('No se pudo conectar a la base de datos SQL Server.', 'error');
    } finally {
      setLoadingRegistered(false);
    }
  };

  // Sincronizar catálogo base desde TMDB a SQL Server
  const handleSyncBaseCatalog = async () => {
    try {
      setIsSyncingBase(true);
      await carteleraService.sincronizarCatalogoBase();
      showToast('¡Catálogo base sincronizado desde TMDB y guardado en SQL Server!', 'success');
      await loadActiveMovies();
    } catch {
      showToast('Error al sincronizar el catálogo base desde TMDB.', 'error');
    } finally {
      setIsSyncingBase(false);
    }
  };

  useEffect(() => {
    void loadActiveMovies();
  }, []);

  // 3. Buscar en TMDB
  const handleSearchTmdb = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!tmdbQuery.trim()) return;

    try {
      setIsSearchingTmdb(true);
      setSelectedTmdbMovie(null);
      const results = await carteleraService.buscarTmdb(tmdbQuery.trim());
      setTmdbResults(results);

      if (results.length === 0) {
        showToast('No se encontraron películas en TMDB para ese término.', 'error');
      }
    } catch {
      showToast('Error al conectar con el servicio de búsqueda TMDB.', 'error');
    } finally {
      setIsSearchingTmdb(false);
    }
  };

  // 4. Seleccionar película de resultados y precargar formulario
  const handleSelectTmdbMovie = async (movie: TmdbSearchResultDto) => {
    try {
      const detail = await carteleraService.obtenerDetalleTmdb(movie.tmdbId);
      setSelectedTmdbMovie(detail);

      setRegTitulo(detail.titulo || movie.titulo);
      setRegSinopsis(detail.sinopsis || movie.sinopsis || '');
      setRegDuracion(detail.duracion || 110);
      setRegClasif(detail.clasificacion || 'B');
      setRegDirector(detail.director || 'Director de Película');
      setRegPosterPath(detail.posterPath || movie.posterPath || movie.posterUrl || '');
    } catch {
      // Fallback a los datos preliminares
      setRegTitulo(movie.titulo);
      setRegSinopsis(movie.sinopsis || '');
      setRegDuracion(120);
      setRegClasif('B');
      setRegDirector('Director Cinematográfico');
      setRegPosterPath(movie.posterPath || movie.posterUrl || '');
      setSelectedTmdbMovie({
        tmdbId: movie.tmdbId,
        titulo: movie.titulo,
        tituloOriginal: movie.tituloOriginal,
        sinopsis: movie.sinopsis,
        duracion: 120,
        clasificacion: 'B',
        director: 'Director Cinematográfico',
        actores: 'Reparto oficial',
        genero: 'Cine',
        posterPath: movie.posterPath || movie.posterUrl || '',
        releaseYear: movie.releaseYear,
        rating: movie.rating,
      });
    }
  };

  // 5. Registrar película en SQL Server
  const handleRegisterMovie = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!regTitulo.trim()) {
      showToast('El título de la película es obligatorio.', 'error');
      return;
    }

    try {
      setIsRegistering(true);
      if (regHorarios.length === 0) {
        showToast('Debes configurar al menos un horario de función.', 'error');
        return;
      }

      const payload: RegistrarPeliculaDto = {
        titulo: regTitulo.trim(),
        sinopsis: regSinopsis.trim() || 'Sinopsis oficial en Cine Teatro Xilotzin.',
        duracion: Number(regDuracion) || 120,
        clasificacion: regClasif || 'B',
        director: regDirector.trim() || 'Director Oficial',
        posterPath: regPosterPath,
        posterImage: regPosterPath,
        idSala: Number(regSala),
        horario: regHorarios[0] || '16:00',
        horarios: regHorarios,
        fechaInicio: regFechaInicio,
        fechaFin: regFechaFin,
        precio: Number(regPrecio),
      };

      await carteleraService.registrarPelicula(payload);
      showToast('¡Película y funciones programadas registradas en SQL Server!', 'success');
      setSelectedTmdbMovie(null);
      setTmdbResults([]);
      setTmdbQuery('');
      await loadActiveMovies();
    } catch {
      showToast('Error al persistir la película en la base de datos.', 'error');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeleteMovie = async (idPelicula: number, titulo: string) => {
    const confirmar = window.confirm(
      `¿Deseas dar de baja "${titulo}" de la cartelera oficial?\nEsta acción retirará la película y sus funciones programadas en SQL Server.`
    );
    if (!confirmar) return;

    try {
      await carteleraService.eliminarPelicula(idPelicula);
      showToast(`"${titulo}" ha sido retirada de cartelera exitosamente.`, 'success');
      await loadActiveMovies();
    } catch {
      showToast('Error al dar de baja la película en la base de datos.', 'error');
    }
  };

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <div className="bg-[#0a0a0a] text-[#f3f4f6] antialiased h-screen flex overflow-hidden selection:bg-[#D81B60] selection:text-white relative font-sans">
      {/* Toast de Notificaciones */}
      {toastMessage && (
        <div
          className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-3 transition-all ${
            toastType === 'success'
              ? 'bg-[#111111] border-[#10B981] text-white'
              : 'bg-[#111111] border-[#E11D2F] text-red-300'
          }`}
        >
          {toastType === 'success' ? <i className="fa-solid fa-circle-check text-emerald-400 text-lg" /> : <i className="fa-solid fa-triangle-exclamation text-amber-400 text-lg" />}
          <span className="font-bold text-xs uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

      {/* Backdrop para Drawer Móvil */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación lateral"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 z-40 backdrop-blur-sm lg:hidden border-none p-0 w-full h-full cursor-default"
        />
      )}

      {/* Sidebar de Navegación del Panel de Trabajadores */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#111111] border-r border-[#262626] flex flex-col h-full shrink-0 shadow-2xl transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
      >
        {/* Header del Sidebar */}
        <div className="h-20 border-b border-[#262626] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmU78ReuLCf8T4T3Rv6K8-yAB13kXuZX7_TQ&s"
              alt="Xilotzin Emblem"
              className="h-10 w-10 rounded-full grayscale brightness-125 object-cover border border-[#262626]"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-serif font-black tracking-widest uppercase leading-none text-white">
                Xilotzin
              </h1>
              <span className="text-[8px] font-sans font-bold tracking-[0.3em] text-[#D81B60] uppercase mt-1">
                Administración
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-[#a3a3a3] hover:text-white p-2 rounded-xl bg-[#050505] border border-[#262626]"
            aria-label="Cerrar menú"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Navegación de Módulos Administrativos */}
        <nav className="flex-grow p-4 flex flex-col gap-2 mt-2 overflow-y-auto">
          {/* HU-10: Dashboard Financiero y Cortes */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('finanzas');
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${
              activeTab === 'finanzas'
                ? 'text-white bg-[#D81B60] shadow-[0_0_15px_rgba(216,27,96,0.3)]'
                : 'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <i className="fa-solid fa-chart-line text-sm" /> Finanzas & Cortes (HU-10)
          </button>

          {/* Módulo de Películas y Cartelera TMDB */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('cartelera');
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${
              activeTab === 'cartelera'
                ? 'text-white bg-[#D81B60] shadow-[0_0_15px_rgba(216,27,96,0.3)]'
                : 'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <i className="fa-solid fa-film text-sm" /> Películas & Cartelera TMDB
          </button>

          <div className="pt-4 mt-2 border-t border-[#262626]">
            <span className="px-4 text-[9px] font-mono uppercase text-[#737373] tracking-wider block mb-2">Accesos Rápidos</span>
            <button
              type="button"
              onClick={() => router.push('/pos')}
              className="w-full text-left px-4 py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-widest text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a] flex items-center gap-3 transition-all"
            >
              <i className="fa-solid fa-cash-register text-sm text-[#D81B60]" /> Terminal POS
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full text-left px-4 py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-widest text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a] flex items-center gap-3 transition-all mt-1"
            >
              <i className="fa-solid fa-globe text-sm text-sky-400" /> Portal Web Público
            </button>
          </div>
        </nav>

        {/* Footer del Sidebar con Rol y Logout */}
        <div className="p-4 border-t border-[#262626] bg-[#050505] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-white font-bold uppercase truncate max-w-[140px]">
              {userName}
            </span>
            <span className="text-[9px] text-[#a3a3a3] uppercase">Rol: Administrador</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#a3a3a3] hover:text-red-500 text-sm font-bold p-1.5 rounded-lg hover:bg-[#111111] transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <i className="fa-solid fa-power-off text-sm" />
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-grow flex flex-col h-full overflow-hidden bg-[#050505] relative">
        {/* Barra Superior */}
        <header className="h-14 border-b border-[#262626] px-4 md:px-8 flex items-center justify-between shrink-0 bg-[#111111] relative z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl bg-[#050505] text-white border border-[#262626] active:scale-95 transition-transform"
              aria-label="Abrir menú de navegación"
            >
              <i className="fa-solid fa-bars text-sm" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {activeTab === 'finanzas' ? 'Módulo Administrativo • Dashboard Financiero' : 'Módulo de Cartelera • Sincronización TMDB'}
              </span>
              <span className="hidden sm:inline-block text-[10px] bg-[#1a1a1a] text-[#a3a3a3] border border-[#333] px-2 py-0.5 rounded font-mono">
                {activeTab === 'finanzas' ? 'HU-10' : 'Catálogo'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SQL Server 2022 Conectado
            </span>
          </div>
        </header>

        {/* Módulo Principal */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
          {activeTab === 'finanzas' ? (
            <FinancialDashboardView />
          ) : (
            <div className="max-w-6xl space-y-8 animate-fadeIn">
            {/* Buscador de Películas TMDB */}
            <div className="bg-[#111111] border border-[#262626] p-6 rounded-2xl shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-serif font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-clapperboard text-[#D81B60]" /> Búsqueda y Selección en TMDB (The Movie Database)
                  </h3>
                  <p className="text-xs text-[#a3a3a3] mt-1">
                    Ingresa el título para importar sinopsis, duración, directores y afiches oficiales.
                  </p>
                </div>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-3 py-1 rounded-full uppercase font-mono font-bold self-start md:self-auto">
                  Persistencia Relativa SQL
                </span>
              </div>

              <form onSubmit={handleSearchTmdb} className="flex gap-3">
                <input
                  type="text"
                  value={tmdbQuery}
                  onChange={(e) => setTmdbQuery(e.target.value)}
                  placeholder="Ej. Batman, Avatar, Spider-Man, Gladiador..."
                  className="flex-grow bg-[#050505] text-white px-4 py-3 rounded-xl border border-[#262626] focus:border-[#D81B60] outline-none text-xs font-medium placeholder-[#737373]"
                />
                <button
                  type="submit"
                  disabled={isSearchingTmdb}
                  className="bg-[#D81B60] hover:bg-pink-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-lg shrink-0"
                >
                  {isSearchingTmdb ? (
                    <i className="fa-solid fa-spinner fa-spin" />
                  ) : (
                    <i className="fa-solid fa-magnifying-glass" />
                  )}
                  <span>Buscar Título</span>
                </button>
              </form>

              {/* Resultados preliminares de TMDB */}
              {tmdbResults.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#262626]">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-[#a3a3a3] mb-4">
                    Resultados Encontrados ({tmdbResults.length}) — Selecciona una película:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[480px] overflow-y-auto pr-2">
                    {tmdbResults.map((movie) => {
                      const posterSrc = getPosterUrl(movie.posterPath || movie.posterUrl);
                      const isSelected = selectedTmdbMovie?.tmdbId === movie.tmdbId;

                      return (
                        <div
                          role="button"
                          tabIndex={0}
                          key={movie.tmdbId}
                          onClick={() => handleSelectTmdbMovie(movie)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              void handleSelectTmdbMovie(movie);
                            }
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex gap-3 ${
                            isSelected
                              ? 'bg-[#D81B60]/20 border-[#D81B60] shadow-md'
                              : 'bg-[#050505] border-[#262626] hover:border-[#a3a3a3]'
                          }`}
                        >
                          <img
                            src={posterSrc}
                            alt={movie.titulo}
                            className="w-16 h-24 object-cover rounded-lg shrink-0 bg-neutral-900 border border-neutral-800"
                          />
                          <div className="flex flex-col justify-between flex-grow min-w-0">
                            <div>
                              <h5 className="font-bold text-xs text-white uppercase truncate">
                                {movie.titulo}
                              </h5>
                              <p className="text-[10px] text-[#a3a3a3] truncate">
                                {movie.tituloOriginal || movie.titulo}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-[#DCA54C] font-bold flex items-center gap-1">
                                  <i className="fa-solid fa-star text-[9px]" /> {movie.rating ? movie.rating.toFixed(1) : '8.0'}
                                </span>
                                <span className="text-[10px] text-[#737373]">
                                  {movie.releaseYear || '2026'}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="text-[10px] uppercase font-bold text-[#D81B60] hover:text-white mt-2 text-left"
                            >
                              {isSelected ? <span className="flex items-center gap-1"><i className="fa-solid fa-check text-xs" /> Seleccionada</span> : 'Configurar →'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Formulario de Asignación y Persistencia */}
            {selectedTmdbMovie && (
              <div className="bg-[#111111] border border-[#262626] p-6 rounded-2xl shadow-2xl animate-fadeIn">
                <div className="flex items-center justify-between border-b border-[#262626] pb-4 mb-6">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#D81B60]">
                      Paso 2 • Configurar Funciones y Guardar en SQL Server
                    </span>
                    <h3 className="text-xl font-serif font-black uppercase text-white mt-1">
                      {regTitulo}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedTmdbMovie(null)}
                    className="text-xs uppercase text-[#a3a3a3] hover:text-white"
                  >
                    Cancelar
                  </button>
                </div>

                <form onSubmit={handleRegisterMovie} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Vista Previa del Afiche (Ruta relativa persistida) */}
                    <div className="flex flex-col items-center">
                      <img
                        src={getPosterUrl(regPosterPath)}
                        alt={regTitulo}
                        className="w-48 h-72 object-cover rounded-xl border border-[#262626] shadow-xl bg-neutral-900"
                      />
                      <span className="text-[10px] font-mono text-[#a3a3a3] mt-2 truncate max-w-full">
                        Path Relativo: {regPosterPath || '/ruta-poster.jpg'}
                      </span>
                      <span className="text-[9px] text-green-400 font-bold uppercase mt-1 flex items-center gap-1">
                        <i className="fa-solid fa-circle-check text-xs" /> Cumple regla CDN / Sin URL absoluta en BD
                      </span>
                    </div>

                    {/* Controles de Registro: Datos TMDB bloqueados + Configuración editable */}
                    <div className="md:col-span-2 space-y-6 text-xs font-sans">
                      
                      {/* Bloque 1: Datos Técnicos Oficiales TMDB (Autocompletados y Solo Lectura) */}
                      <div className="bg-[#0a0a0a] border border-[#222222] rounded-2xl p-4 space-y-4">
                        <div className="flex items-center justify-between border-b border-[#1c1c1c] pb-2.5">
                          <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider flex items-center gap-1.5">
                            <i className="fa-solid fa-lock text-amber-400 text-xs" />
                            Datos Técnicos de TMDB
                          </span>
                          <span className="text-[9px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded font-mono uppercase font-bold">
                            Autocompletado • Solo Lectura
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="dashboard-reg-titulo" className="block text-[#737373] uppercase font-bold tracking-wider mb-1 text-[10px]">
                              Título Oficial
                            </label>
                            <input
                              id="dashboard-reg-titulo"
                              type="text"
                              value={regTitulo}
                              readOnly
                              tabIndex={-1}
                              className="w-full bg-[#121212] text-white font-bold px-4 py-2.5 rounded-xl border border-[#262626] cursor-not-allowed opacity-90 outline-none select-none"
                            />
                          </div>

                          <div>
                            <label htmlFor="dashboard-reg-director" className="block text-[#737373] uppercase font-bold tracking-wider mb-1 text-[10px]">
                              Director
                            </label>
                            <input
                              id="dashboard-reg-director"
                              type="text"
                              value={regDirector}
                              readOnly
                              tabIndex={-1}
                              className="w-full bg-[#121212] text-neutral-200 font-semibold px-4 py-2.5 rounded-xl border border-[#262626] cursor-not-allowed opacity-90 outline-none select-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="dashboard-reg-sinopsis" className="block text-[#737373] uppercase font-bold tracking-wider mb-1 text-[10px]">
                            Sinopsis Oficial
                          </label>
                          <textarea
                            id="dashboard-reg-sinopsis"
                            value={regSinopsis || 'Sinopsis oficial no proporcionada por TMDB.'}
                            readOnly
                            tabIndex={-1}
                            rows={2}
                            className="w-full bg-[#121212] text-neutral-300 p-3 rounded-xl border border-[#262626] cursor-not-allowed opacity-90 leading-relaxed outline-none select-none resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-[#121212] p-2.5 rounded-xl border border-[#262626] text-center">
                            <span className="block text-[9px] uppercase font-bold text-[#737373]">Duración</span>
                            <span className="text-xs font-mono font-bold text-white">{regDuracion} min</span>
                          </div>
                          <div className="bg-[#121212] p-2.5 rounded-xl border border-[#262626] text-center">
                            <span className="block text-[9px] uppercase font-bold text-[#737373]">Clasificación</span>
                            <span className="text-xs font-mono font-bold text-pink-400">{regClasif}</span>
                          </div>
                          <div className="bg-[#121212] p-2.5 rounded-xl border border-[#262626] text-center">
                            <span className="block text-[9px] uppercase font-bold text-[#737373]">Calificación</span>
                            <span className="text-xs font-mono font-bold text-amber-400 flex items-center justify-center gap-1">
                              <i className="fa-solid fa-star text-[10px]" /> {selectedTmdbMovie.rating ? selectedTmdbMovie.rating.toFixed(1) : '8.0'}
                            </span>
                          </div>
                          <div className="bg-[#121212] p-2.5 rounded-xl border border-[#262626] text-center">
                            <span className="block text-[9px] uppercase font-bold text-[#737373]">Año Estreno</span>
                            <span className="text-xs font-mono font-bold text-neutral-300">{selectedTmdbMovie.releaseYear || '2026'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Bloque 2: Configuración de Exhibición (Editable por el Usuario) */}
                      <div className="bg-[#141414] border border-[#D81B60]/40 rounded-2xl p-5 space-y-5 shadow-lg">
                        <div className="flex items-center justify-between border-b border-[#262626] pb-2.5">
                          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <i className="fa-solid fa-calendar-days text-[#D81B60]" />
                            Configuración de Fechas y Horarios
                          </span>
                          <span className="text-[10px] text-pink-300 font-bold uppercase tracking-wider">
                            * Modificable por Usuario
                          </span>
                        </div>

                        {/* Rango de Fechas Disponibles */}
                        <div>
                          <label className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-2 text-[10px]">
                            Fechas que va a estar disponible en Cartelera
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-3 flex flex-col gap-1">
                              <span className="text-[10px] text-[#737373] uppercase font-bold flex items-center gap-1.5">
                                <i className="fa-solid fa-play text-green-400 text-[9px]" /> Fecha de Inicio
                              </span>
                              <input
                                type="date"
                                value={regFechaInicio}
                                min={getTodayString()}
                                onChange={(e) => setRegFechaInicio(e.target.value)}
                                required
                                className="bg-transparent text-white font-mono text-xs font-bold outline-none cursor-pointer mt-1"
                              />
                            </div>
                            <div className="bg-[#0a0a0a] border border-[#262626] rounded-xl p-3 flex flex-col gap-1">
                              <span className="text-[10px] text-[#737373] uppercase font-bold flex items-center gap-1.5">
                                <i className="fa-solid fa-stop text-red-400 text-[9px]" /> Fecha de Fin
                              </span>
                              <input
                                type="date"
                                value={regFechaFin}
                                min={regFechaInicio}
                                onChange={(e) => setRegFechaFin(e.target.value)}
                                required
                                className="bg-transparent text-white font-mono text-xs font-bold outline-none cursor-pointer mt-1"
                              />
                            </div>
                          </div>
                          <p className="text-[10px] text-neutral-400 mt-2 font-medium">
                            Las funciones se crearán automáticamente en la base de datos para cada día dentro de este rango.
                          </p>
                        </div>

                        {/* Horarios de la Película */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-[#a3a3a3] uppercase font-bold tracking-wider text-[10px]">
                              Horarios de Función por Día ({regHorarios.length} activos)
                            </label>
                            <span className="text-[10px] text-neutral-400">
                              Haz clic en una hora para activarla o desactivarla
                            </span>
                          </div>

                          {/* Chips de Horarios Activos */}
                          <div className="flex flex-wrap gap-2 mb-3 min-h-[32px] p-2 bg-[#0a0a0a] border border-[#262626] rounded-xl items-center">
                            {regHorarios.map((hora) => (
                              <span
                                key={hora}
                                className="inline-flex items-center gap-1.5 bg-[#D81B60] text-white px-3 py-1 rounded-lg font-mono text-xs font-bold shadow-md animate-fadeIn"
                              >
                                <i className="fa-solid fa-clock text-[10px]" />
                                {hora} hrs
                                <button
                                  type="button"
                                  onClick={() => handleRemoveHorario(hora)}
                                  className="ml-1 text-white/80 hover:text-white hover:scale-125 transition-transform"
                                  title="Remover este horario"
                                >
                                  <i className="fa-solid fa-xmark text-[10px]" />
                                </button>
                              </span>
                            ))}
                          </div>

                          {/* Selección Rápida + Horario Personalizado */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {['11:00', '13:30', '16:00', '18:30', '21:00', '22:15'].map((time) => {
                              const isActive = regHorarios.includes(time);
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => toggleHorario(time)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                                    isActive
                                      ? 'bg-neutral-800 text-pink-300 border border-pink-500/50'
                                      : 'bg-[#0a0a0a] text-neutral-400 border border-[#262626] hover:text-white hover:border-neutral-600'
                                  }`}
                                >
                                  <i className={`fa-solid ${isActive ? 'fa-check text-pink-400' : 'fa-plus text-neutral-500'} text-[10px]`} />
                                  {time}
                                </button>
                              );
                            })}

                            <div className="flex items-center gap-1 ml-auto">
                              <input
                                type="time"
                                aria-label="Horario personalizado"
                                value={customHorario}
                                onChange={(e) => setCustomHorario(e.target.value)}
                                className="bg-[#0a0a0a] text-white px-2.5 py-1.5 rounded-lg border border-[#262626] font-mono text-xs"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomHorario}
                                className="px-3 py-1.5 bg-[#262626] hover:bg-[#333333] text-white rounded-lg text-xs font-bold uppercase transition-colors"
                              >
                                + Agregar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Asignación Operativa: Sala y Precio */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#262626]">
                          <div>
                            <label htmlFor="dashboard-reg-sala" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1 text-[10px]">
                              Asignar Sala
                            </label>
                            <select
                              id="dashboard-reg-sala"
                              value={regSala}
                              onChange={(e) => setRegSala(Number(e.target.value))}
                              className="w-full bg-[#0a0a0a] text-white p-3 rounded-xl border border-[#262626] font-bold outline-none focus:border-[#D81B60]"
                            >
                              <option value={1}>Sala 1 MacroXE</option>
                              <option value={2}>Sala 2 Digital 2D</option>
                            </select>
                          </div>

                          <div>
                            <label htmlFor="dashboard-reg-precio" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1 text-[10px]">
                              Precio Boleto ($ MXN)
                            </label>
                            <input
                              id="dashboard-reg-precio"
                              type="number"
                              value={regPrecio}
                              onChange={(e) => setRegPrecio(Number(e.target.value))}
                              min={10}
                              max={500}
                              className="w-full bg-[#0a0a0a] text-white p-3 rounded-xl border border-[#262626] text-center font-bold text-green-400 outline-none focus:border-[#D81B60]"
                            />
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>

                  {/* Botón de Guardado Final */}
                  <div className="pt-4 border-t border-[#262626] flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedTmdbMovie(null)}
                      className="px-6 py-3 rounded-xl bg-[#050505] text-[#a3a3a3] hover:text-white border border-[#262626] text-xs font-bold uppercase tracking-wider"
                    >
                      Descartar
                    </button>
                    <button
                      type="submit"
                      disabled={isRegistering}
                      className="px-8 py-3 rounded-xl bg-[#D81B60] hover:bg-pink-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2"
                    >
                      {isRegistering ? 'Guardando en BD...' : <span className="flex items-center gap-2"><i className="fa-solid fa-floppy-disk" /> Registrar en Cartelera SQL Server</span>}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista de Películas Registradas Actualmente en SQL Server */}
            <div className="bg-[#111111] border border-[#262626] rounded-2xl overflow-hidden shadow-lg">
              <div className="p-5 border-b border-[#262626] flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-sans font-bold uppercase tracking-widest text-white">
                    Títulos en Exhibición Oficial en CineDataBase ({registeredMovies.length})
                  </h4>
                  <p className="text-[10px] text-[#a3a3a3] mt-0.5">
                    Sincronizadas desde SQL Server con sus funciones programadas
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSyncBaseCatalog}
                    disabled={isSyncingBase}
                    className="text-xs uppercase font-bold text-neutral-300 hover:text-white bg-[#1f1f1f] hover:bg-[#2a2a2a] px-3 py-1.5 rounded-xl border border-[#333] transition-colors flex items-center gap-1.5"
                    title="Importar y programar las 8 películas oficiales base de TMDB en SQL Server"
                  >
                    <i className={`fa-solid ${isSyncingBase ? 'fa-spinner fa-spin' : 'fa-cloud-arrow-down'} text-pink-400 text-xs`} />
                    {isSyncingBase ? 'Sincronizando...' : 'Sincronizar Catálogo Base TMDB'}
                  </button>
                  <button
                    onClick={loadActiveMovies}
                    disabled={loadingRegistered}
                    className="text-xs uppercase font-bold text-[#D81B60] hover:underline"
                  >
                    {loadingRegistered ? 'Actualizando...' : <span className="flex items-center gap-1"><i className="fa-solid fa-arrows-rotate text-xs" /> Recargar Cartelera</span>}
                  </button>
                </div>
              </div>

              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {registeredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="bg-[#050505] border border-[#262626] rounded-xl p-3 flex gap-3 items-start"
                  >
                    <img
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-16 h-24 object-cover rounded-lg shrink-0 bg-neutral-900 border border-neutral-800"
                    />
                    <div className="flex flex-col min-w-0 flex-grow">
                      <span className="text-[9px] uppercase font-bold text-[#D81B60]">
                        {movie.classification} • {movie.duration}
                      </span>
                      <h5 className="font-bold text-xs text-white uppercase truncate mt-0.5">
                        {movie.title}
                      </h5>
                      <p className="text-[10px] text-[#a3a3a3] truncate mt-0.5">
                        Dir: {movie.director}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {movie.showtimes.slice(0, 3).map((h) => (
                          <span
                            key={`${movie.id}-${h}`}
                            className="bg-[#111111] border border-[#262626] text-[9px] font-mono text-white px-1.5 py-0.5 rounded"
                          >
                            {h}
                          </span>
                        ))}
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-[#1a1a1a] flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteMovie(movie.id, movie.title)}
                          className="text-[10px] uppercase font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                          title="Dar de baja de cartelera"
                        >
                          <i className="fa-solid fa-trash-can mr-1.5" /> Dar de Baja
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
        </div>
      </main>
    </div>
  );
}

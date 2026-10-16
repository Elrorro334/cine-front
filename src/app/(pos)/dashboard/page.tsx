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

export default function DashboardPage() {
  const router = useRouter();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Administrador');

  // Cartelera en SQL Server
  const [registeredMovies, setRegisteredMovies] = useState<Movie[]>([]);
  const [loadingRegistered, setLoadingRegistered] = useState(false);

  // TMDB Search State
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [isSearchingTmdb, setIsSearchingTmdb] = useState(false);
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResultDto[]>([]);
  const [selectedTmdbMovie, setSelectedTmdbMovie] = useState<TmdbMovieDetailDto | null>(null);

  // Formulario de Registro
  const [regTitulo, setRegTitulo] = useState('');
  const [regSinopsis, setRegSinopsis] = useState('');
  const [regDuracion, setRegDuracion] = useState(120);
  const [regClasif, setRegClasif] = useState('B');
  const [regDirector, setRegDirector] = useState('Director General');
  const [regPosterPath, setRegPosterPath] = useState('');
  const [regSala, setRegSala] = useState<number>(1);
  const [regHorario, setRegHorario] = useState('16:00');
  const [regPrecio, setRegPrecio] = useState(50);
  const [isRegistering, setIsRegistering] = useState(false);

  // Toast / Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Verificación de sesión de usuario
  useEffect(() => {
    const session = authService.getUserSession();
    if (!session) {
      router.push('/login');
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
      const payload: RegistrarPeliculaDto = {
        titulo: regTitulo.trim(),
        sinopsis: regSinopsis.trim(),
        duracion: Number(regDuracion),
        clasificacion: regClasif,
        director: regDirector.trim(),
        posterPath: regPosterPath,
        posterImage: regPosterPath,
        idSala: Number(regSala),
        horario: regHorario,
        precio: Number(regPrecio),
      };

      await carteleraService.registrarPelicula(payload);
      showToast('¡Película registrada en cartelera SQL Server exitosamente!', 'success');
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
          <span className="text-lg">{toastType === 'success' ? '✓' : '⚠'}</span>
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
            ✕
          </button>
        </div>

        {/* Solo el módulo requerido: PELÍCULAS & CARTELERA TMDB */}
        <nav className="flex-grow p-4 flex flex-col gap-2 mt-2 overflow-y-auto">
          <div
            className="w-full text-left px-4 py-3 rounded-xl font-sans font-bold text-xs uppercase tracking-widest text-white bg-[#D81B60] shadow-[0_0_15px_rgba(216,27,96,0.3)] flex items-center gap-3 cursor-default"
          >
            <span>🎬</span> Películas & Cartelera TMDB
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
            ⏻
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-grow flex flex-col h-full overflow-hidden bg-[#050505] relative">
        {/* Barra Superior Limpia (Sin título redundante, fecha, badge ni botón de nueva película) */}
        <header className="h-12 border-b border-[#262626] px-4 md:px-8 flex items-center justify-between shrink-0 bg-[#111111] relative z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl bg-[#050505] text-white border border-[#262626] active:scale-95 transition-transform"
              aria-label="Abrir menú de navegación"
            >
              ☰
            </button>
          </div>
        </header>

        {/* Módulo Principal: Películas & Cartelera TMDB */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
          <div className="max-w-6xl space-y-8 animate-fadeIn">
            {/* Buscador de Películas TMDB */}
            <div className="bg-[#111111] border border-[#262626] p-6 rounded-2xl shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-serif font-black uppercase text-white tracking-wider flex items-center gap-2">
                    <span>🎬</span> Búsqueda y Selección en TMDB (The Movie Database)
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
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <span>🔍</span>
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
                                <span className="text-[10px] text-[#DCA54C] font-bold">
                                  ★ {movie.rating ? movie.rating.toFixed(1) : '8.0'}
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
                              {isSelected ? '✓ Seleccionada' : 'Configurar →'}
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
                      <span className="text-[9px] text-green-400 font-bold uppercase mt-1">
                        ✔ Cumple regla CDN / Sin URL absoluta en BD
                      </span>
                    </div>

                    {/* Campos Técnicos de la Película */}
                    <div className="md:col-span-2 space-y-4 text-xs font-sans">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="dashboard-reg-titulo" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1">
                            Título Oficial
                          </label>
                          <input
                            id="dashboard-reg-titulo"
                            type="text"
                            value={regTitulo}
                            onChange={(e) => setRegTitulo(e.target.value)}
                            required
                            className="w-full bg-[#050505] text-white px-4 py-3 rounded-xl border border-[#262626] focus:border-[#D81B60] outline-none"
                          />
                        </div>

                        <div>
                          <label htmlFor="dashboard-reg-director" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1">
                            Director
                          </label>
                          <input
                            id="dashboard-reg-director"
                            type="text"
                            value={regDirector}
                            onChange={(e) => setRegDirector(e.target.value)}
                            required
                            className="w-full bg-[#050505] text-white px-4 py-3 rounded-xl border border-[#262626] focus:border-[#D81B60] outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="dashboard-reg-sinopsis" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1">
                          Sinopsis
                        </label>
                        <textarea
                          id="dashboard-reg-sinopsis"
                          value={regSinopsis}
                          onChange={(e) => setRegSinopsis(e.target.value)}
                          rows={3}
                          className="w-full bg-[#050505] text-white p-3 rounded-xl border border-[#262626] focus:border-[#D81B60] outline-none leading-relaxed"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <label htmlFor="dashboard-reg-duracion" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1">
                            Duración (min)
                          </label>
                          <input
                            id="dashboard-reg-duracion"
                            type="number"
                            value={regDuracion}
                            onChange={(e) => setRegDuracion(Number(e.target.value))}
                            min={30}
                            max={360}
                            className="w-full bg-[#050505] text-white p-3 rounded-xl border border-[#262626] text-center font-bold"
                          />
                        </div>

                        <div>
                          <label htmlFor="dashboard-reg-clasif" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1">
                            Clasificación
                          </label>
                          <select
                            id="dashboard-reg-clasif"
                            value={regClasif}
                            onChange={(e) => setRegClasif(e.target.value)}
                            className="w-full bg-[#050505] text-white p-3 rounded-xl border border-[#262626] font-bold"
                          >
                            <option value="AA">AA (Infantil)</option>
                            <option value="A">A (Familiar)</option>
                            <option value="B">B (Adolescentes)</option>
                            <option value="B15">B15 (+15 años)</option>
                            <option value="C">C (Adultos)</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="dashboard-reg-sala" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1">
                            Asignar Sala
                          </label>
                          <select
                            id="dashboard-reg-sala"
                            value={regSala}
                            onChange={(e) => setRegSala(Number(e.target.value))}
                            className="w-full bg-[#050505] text-white p-3 rounded-xl border border-[#262626] font-bold"
                          >
                            <option value={1}>Sala 1 MacroXE</option>
                            <option value={2}>Sala 2 Digital 2D</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="dashboard-reg-precio" className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-1">
                            Precio Boleto ($)
                          </label>
                          <input
                            id="dashboard-reg-precio"
                            type="number"
                            value={regPrecio}
                            onChange={(e) => setRegPrecio(Number(e.target.value))}
                            min={10}
                            max={500}
                            className="w-full bg-[#050505] text-white p-3 rounded-xl border border-[#262626] text-center font-bold text-green-400"
                          />
                        </div>
                      </div>

                      {/* Horario de Exhibición */}
                      <div className="pt-2">
                        <span className="block text-[#a3a3a3] uppercase font-bold tracking-wider mb-2">
                          Horario de Función (Hoy)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {['11:00', '13:30', '16:00', '18:30', '21:00', '22:15'].map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => setRegHorario(time)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                regHorario === time
                                  ? 'bg-[#D81B60] text-white shadow-md'
                                  : 'bg-[#050505] text-[#a3a3a3] border border-[#262626] hover:text-white'
                              }`}
                            >
                              {time}
                            </button>
                          ))}
                          <input
                            type="time"
                            aria-label="Horario personalizado"
                            value={regHorario}
                            onChange={(e) => setRegHorario(e.target.value)}
                            className="bg-[#050505] text-white px-3 py-1.5 rounded-xl border border-[#262626] font-mono text-xs"
                          />
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
                      {isRegistering ? 'Guardando en BD...' : '💾 Registrar en Cartelera SQL Server'}
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
                <button
                  onClick={loadActiveMovies}
                  disabled={loadingRegistered}
                  className="text-xs uppercase font-bold text-[#D81B60] hover:underline"
                >
                  {loadingRegistered ? 'Actualizando...' : '↻ Recargar Cartelera'}
                </button>
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
                          <span>🗑</span> Dar de Baja
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

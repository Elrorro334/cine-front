import { apiFetch } from '@/lib/apiClient';
import { getPosterUrl } from '@/lib/tmdb';
import {
  PeliculaCarteleraDto,
  TmdbSearchResultDto,
  TmdbMovieDetailDto,
  RegistrarPeliculaDto,
  PromocionDto,
} from '@/types/api';
import { Movie, Promotion } from '@/types/cartelera';

function formatShowtime(horaRaw: string): string {
  if (!horaRaw) return '16:00';
  if (horaRaw.includes(' ')) {
    return horaRaw.split(' ')[1].substring(0, 5);
  }
  if (horaRaw.includes('T')) {
    return horaRaw.split('T')[1].substring(0, 5);
  }
  return horaRaw.substring(0, 5);
}

function mapDtoToMovie(dto: PeliculaCarteleraDto): Movie {
  const posterRaw = dto.poster_path || dto.poster_image;
  const posterUrl = getPosterUrl(posterRaw);

  const funcionesMapped = dto.funciones && dto.funciones.length > 0
    ? dto.funciones.map((f) => ({
        idFuncion: f.idFuncion,
        hora: formatShowtime(f.hora),
        nombreSala: f.nombreSala || 'Sala 1',
        precio: f.precio || 50,
      }))
    : [];

  return {
    id: dto.idPelicula,
    title: dto.titulo,
    tagline: 'En Exhibición Hoy',
    classification: dto.clasificacion || 'B',
    duration: dto.duracion ? `${dto.duracion} min` : '115 min',
    genre: 'Estreno',
    allGenres: 'Cine',
    rating: '8.5',
    posterUrl,
    backdropUrl: posterUrl,
    synopsis: dto.sinopsis || 'Vive la experiencia cinematográfica en la pantalla gigante del Cine Teatro Xilotzin.',
    releaseYear: '2026',
    director: dto.director || 'Director Cinematográfico',
    actors: 'Reparto estelar',
    trailerKey: null,
    showtimes: funcionesMapped.map((f) => f.hora),
    funciones: funcionesMapped,
  };
}

export const carteleraService = {
  /**
   * Obtiene promociones dinámicas desde la API de .NET Core (cine-back)
   */
  async getPromociones(): Promise<Promotion[]> {
    try {
      const data = await apiFetch<PromocionDto[]>('/cartelera/promociones');
      if (Array.isArray(data)) {
        return data.map((p) => ({
          id: p.id,
          title: p.titulo,
          tag: p.tag,
          description: p.descripcion,
          validity: p.fecha,
          gradient: p.bg,
          icon: p.icono,
        }));
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Obtiene la cartelera pública desde la API REST de .NET Core (cine-back)
   * Cumple con la regla de arquitectura API-First: datos reales de SQL Server sin fallback simulado.
   */
  async getCarteleraHoy(busqueda?: string): Promise<Movie[]> {
    try {
      const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
      const data = await apiFetch<PeliculaCarteleraDto[]>(`/cartelera${query}`);

      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapDtoToMovie);
      }

      return [];
    } catch {
      return [];
    }
  },

  /**
   * Busca películas en TheMovieDB a través del backend de .NET Core (panel administrativo)
   */
  async buscarTmdb(query: string): Promise<TmdbSearchResultDto[]> {
    if (!query.trim()) return [];
    return apiFetch<TmdbSearchResultDto[]>(
      `/cartelera/buscar-tmdb?query=${encodeURIComponent(query.trim())}`
    );
  },

  /**
   * Obtiene los detalles completos de una película en TMDB vía backend
   */
  async obtenerDetalleTmdb(tmdbId: number): Promise<TmdbMovieDetailDto> {
    return apiFetch<TmdbMovieDetailDto>(`/cartelera/detalle-tmdb/${tmdbId}`);
  },

  /**
   * Registra una nueva película en SQL Server persistiendo solo la ruta relativa
   */
  async registrarPelicula(dto: RegistrarPeliculaDto): Promise<PeliculaCarteleraDto> {
    const payload = {
      ...dto,
      posterPath: dto.posterPath || dto.posterImage || '',
      posterImage: dto.posterImage || dto.posterPath || '',
    };
    return apiFetch<PeliculaCarteleraDto>('/cartelera/registrar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Sincroniza / inicializa el catálogo base de películas oficiales desde TMDB en SQL Server
   */
  async sincronizarCatalogoBase(): Promise<PeliculaCarteleraDto[]> {
    return apiFetch<PeliculaCarteleraDto[]>('/cartelera/sincronizar-catalogo-base', {
      method: 'POST',
    });
  },

  /**
   * Da de baja / elimina una película de la cartelera en SQL Server
   */
  async eliminarPelicula(idPelicula: number): Promise<boolean> {
    const res = await apiFetch<{ success: boolean; message: string }>(
      `/cartelera/pelicula/${idPelicula}`,
      { method: 'DELETE' }
    );
    return res.success;
  },
};

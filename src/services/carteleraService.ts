import { apiFetch } from '@/lib/apiClient';
import { getPosterUrl } from '@/lib/tmdb';
import {
  PeliculaCarteleraDto,
  TmdbSearchResultDto,
  TmdbMovieDetailDto,
  RegistrarPeliculaDto,
} from '@/types/api';
import { Movie, Promotion } from '@/types/cartelera';

// Promociones iniciales y vigentes del Cine Teatro Xilotzin (Banner informativo)
const initialPromotions: Promotion[] = [
  {
    id: 1,
    title: 'Miércoles 2x1 en Boletos de Taquilla',
    tag: 'Promoción Tradicional',
    description: 'Todos los miércoles vive el séptimo arte al doble. Aplica en todas las funciones y horarios del día.',
    validity: 'Todos los miércoles',
    gradient: 'from-amber-950/80 via-black to-neutral-950',
    icon: 'ticket',
  },
  {
    id: 2,
    title: '¡Gran Estreno de Medianoche Este Jueves!',
    tag: 'Estreno Exclusivo',
    description: 'Aparta tus boletos de acceso general en preventa. Sonido digital envolvente y pantalla gigante en Jilotepec.',
    validity: 'Válido esta semana',
    gradient: 'from-pink-950/80 via-black to-neutral-950',
    icon: 'clapperboard',
  },
  {
    id: 3,
    title: 'Pre-ordena en Línea y Paga en Taquilla',
    tag: 'Nuevo Módulo QR',
    description: 'Genera tu código QR con validez de 8 a 15 días. Llega a caja física, escanea tu ticket digital y evita filas.',
    validity: 'Servicio 24/7',
    gradient: 'from-emerald-950/80 via-black to-neutral-950',
    icon: 'qrcode',
  },
];

// Catálogo de respaldo local si el backend no tiene conexión momentánea
const fallbackCatalog: Movie[] = [
  {
    id: 1,
    title: 'Spider-Man: Un Nuevo Día',
    tagline: 'Gran Función en Pantalla Gigante',
    classification: 'B',
    duration: '130 min',
    genre: 'Acción',
    allGenres: 'Acción, Aventuras',
    rating: '8.9',
    posterUrl: getPosterUrl('/fBFjaDWfNslvrs6bJjknmG27wOS.jpg'),
    backdropUrl: '',
    synopsis: 'Peter Parker equilibra su vida personal y protege la ciudad de una nueva amenaza en Jilotepec.',
    releaseYear: '2026',
    director: 'Sam Raimi',
    actors: 'Reparto estelar',
    trailerKey: null,
    showtimes: ['14:00', '18:00', '21:15'],
  },
  {
    id: 2,
    title: 'Super Mario Bros. La película',
    tagline: 'Aventura para Toda la Familia',
    classification: 'AA',
    duration: '92 min',
    genre: 'Animación',
    allGenres: 'Animación, Familia',
    rating: '8.8',
    posterUrl: getPosterUrl('/zNKs1T0VZuJiVuhuL5GSCNkGdxf.jpg'),
    backdropUrl: '',
    synopsis: 'Mario y Luigi viajan por un laberinto subterráneo para rescatar a la princesa.',
    releaseYear: '2026',
    director: 'Aaron Horvath',
    actors: 'Reparto oficial',
    trailerKey: null,
    showtimes: ['12:00', '15:00', '17:30'],
  },
  {
    id: 3,
    title: 'Avatar',
    tagline: 'Experiencia Visual Inmersiva',
    classification: 'B',
    duration: '190 min',
    genre: 'Ciencia Ficción',
    allGenres: 'Aventura, Ciencia Ficción',
    rating: '8.7',
    posterUrl: getPosterUrl('/8zHIgB6tP34Ie34ddllzLg3F4YP.jpg'),
    backdropUrl: '',
    synopsis: 'Jake Sully y Neytiri forman una familia y exploran los océanos de Pandora.',
    releaseYear: '2026',
    director: 'James Cameron',
    actors: 'Reparto oficial',
    trailerKey: null,
    showtimes: ['16:00', '20:30'],
  },
  {
    id: 4,
    title: 'Terrifier',
    tagline: 'Sólo para Mayores de Edad',
    classification: 'C',
    duration: '125 min',
    genre: 'Terror',
    allGenres: 'Terror, Suspenso',
    rating: '8.2',
    posterUrl: getPosterUrl('/fjXqhGmaeQpB73WerhrYU6HlyV5.jpg'),
    backdropUrl: '',
    synopsis: 'Art the Clown regresa para sembrar el terror entre los habitantes de la ciudad.',
    releaseYear: '2026',
    director: 'Damien Leone',
    actors: 'Reparto oficial',
    trailerKey: null,
    showtimes: ['21:30', '23:45'],
  },
  {
    id: 5,
    title: 'Batman',
    tagline: 'El Héroe que Jilotepec Merece',
    classification: 'B15',
    duration: '152 min',
    genre: 'Acción',
    allGenres: 'Acción, Suspenso',
    rating: '9.0',
    posterUrl: getPosterUrl('/mo7teil1qH0SxgLijnqeYP1Eb4w.jpg'),
    backdropUrl: '',
    synopsis: 'Batman se enfrenta al crimen y la corrupción desatada en Ciudad Gótica.',
    releaseYear: '2026',
    director: 'Christopher Nolan',
    actors: 'Reparto oficial',
    trailerKey: null,
    showtimes: ['15:30', '19:00', '22:15'],
  },
  {
    id: 6,
    title: 'IntensaMente 2',
    tagline: 'Nuevas Emociones en Pantalla Grande',
    classification: 'A',
    duration: '96 min',
    genre: 'Animación',
    allGenres: 'Animación, Familia',
    rating: '8.6',
    posterUrl: getPosterUrl('/4HEJdpcmTGm3BWWic31G4aCnuC6.jpg'),
    backdropUrl: '',
    synopsis: 'Riley entra a la adolescencia y nuevas emociones llegan al cuartel general.',
    releaseYear: '2026',
    director: 'Kelsey Mann',
    actors: 'Reparto oficial',
    trailerKey: null,
    showtimes: ['11:00', '13:30', '16:00'],
  },
  {
    id: 7,
    title: 'Duna: Parte Dos',
    tagline: 'El Destino de una Galaxia',
    classification: 'B',
    duration: '166 min',
    genre: 'Ciencia Ficción',
    allGenres: 'Aventura, Drama',
    rating: '8.8',
    posterUrl: getPosterUrl('/1Op57Khovv3ANSWn3TvhMStBboV.jpg'),
    backdropUrl: '',
    synopsis: 'Paul Atreides se une a Chani y a los Fremen en busca de venganza y paz.',
    releaseYear: '2026',
    director: 'Denis Villeneuve',
    actors: 'Reparto oficial',
    trailerKey: null,
    showtimes: ['17:00', '20:45'],
  },
  {
    id: 8,
    title: 'Gladiador II',
    tagline: 'El Retorno al Coliseo',
    classification: 'B15',
    duration: '148 min',
    genre: 'Acción',
    allGenres: 'Acción, Historia',
    rating: '8.5',
    posterUrl: getPosterUrl('/fbcs5AxrdXwyj1b8bGGMgC9kXrM.jpg'),
    backdropUrl: '',
    synopsis: 'Años después de la muerte de Máximo, un nuevo héroe lucha en el Coliseo por la libertad.',
    releaseYear: '2026',
    director: 'Ridley Scott',
    actors: 'Reparto oficial',
    trailerKey: null,
    showtimes: ['18:30', '21:30'],
  },
];

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
    showtimes: dto.funciones && dto.funciones.length > 0
      ? dto.funciones.map((f) => formatShowtime(f.hora))
      : ['14:00', '17:30', '20:45'],
  };
}

export const carteleraService = {
  getPromociones(): Promotion[] {
    return initialPromotions;
  },

  /**
   * Obtiene la cartelera pública desde la API REST de .NET Core (cine-back)
   * Cumple con la regla de arquitectura API-First: sin llamadas externas ni ORM en el front.
   */
  async getCarteleraHoy(busqueda?: string): Promise<Movie[]> {
    try {
      const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
      const data = await apiFetch<PeliculaCarteleraDto[]>(`/cartelera${query}`);

      if (Array.isArray(data) && data.length > 0) {
        return data.map(mapDtoToMovie);
      }

      return fallbackCatalog;
    } catch {
      return fallbackCatalog;
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

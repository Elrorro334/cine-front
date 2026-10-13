import { Movie, Promotion } from '@/types/cartelera';

const TMDB_API_KEY = 'a9b90184f1235d3b78c24e4b31e993b8';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// Catálogo base de películas en exhibición para Cine Teatro Xilotzin
const localCatalog: ReadonlyArray<{ id: number; title: string; showtimes: string[]; fallbackClassification: string }> = [
  { id: 1, title: 'Caminos del Crimen', showtimes: ['10:30', '15:00', '19:30'], fallbackClassification: 'B15' },
  { id: 2, title: 'Payaso terrifier', showtimes: ['12:30', '17:15', '22:00'], fallbackClassification: 'C' },
  { id: 3, title: 'La posesion de la momia', showtimes: ['14:30', '19:00'], fallbackClassification: 'B' },
  { id: 4, title: 'Spiderman', showtimes: ['11:00', '16:30', '21:15'], fallbackClassification: 'A' },
  { id: 5, title: 'The Super Mario Bros. Movie', showtimes: ['13:00', '16:00', '18:45'], fallbackClassification: 'AA' },
  { id: 6, title: 'Avatar: Fire and Ash', showtimes: ['15:30', '21:00'], fallbackClassification: 'B' },
  { id: 7, title: "Five Nights at Freddy's 2", showtimes: ['17:45', '20:30', '23:15'], fallbackClassification: 'B15' },
  { id: 8, title: 'Super Mario Galaxy', showtimes: ['09:00', '12:00', '14:45'], fallbackClassification: 'AA' },
];

const fallbackPosters: Record<number, string> = {
  1: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600',
  2: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=600',
  3: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?q=80&w=600',
  4: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=600',
  5: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600',
  6: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600',
  7: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=600',
  8: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=600',
};

// Promociones iniciales y vigentes del Cine Teatro Xilotzin
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

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbCrewMember {
  job: string;
  name: string;
}

interface TmdbCastMember {
  name: string;
}

interface TmdbReleaseDateItem {
  certification: string;
}

interface TmdbReleaseDatesResult {
  iso_3166_1: string;
  release_dates: TmdbReleaseDateItem[];
}

interface TmdbVideoItem {
  site: string;
  type: string;
  key: string;
}

interface TmdbMovieDetailsResponse {
  title?: string;
  tagline?: string;
  overview?: string;
  runtime?: number;
  vote_average?: number;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  genres?: TmdbGenre[];
  credits?: {
    crew?: TmdbCrewMember[];
    cast?: TmdbCastMember[];
  };
  release_dates?: {
    results?: TmdbReleaseDatesResult[];
  };
  videos?: {
    results?: TmdbVideoItem[];
  };
}

interface TmdbSearchResultItem {
  id: number;
}

interface TmdbSearchResponse {
  results?: TmdbSearchResultItem[];
}

const certificationMap: Record<string, string> = {
  R: 'C',
  'PG-13': 'B15',
  PG: 'B',
  G: 'AA',
  'NC-17': 'C',
};

function resolveClassification(certRaw: string, fallback: string): string {
  if (!certRaw) return fallback;
  return certificationMap[certRaw] ?? certRaw;
}

async function fetchTmdbMovie(
  item: { id: number; title: string; showtimes: string[]; fallbackClassification: string }
): Promise<Movie> {
  const defaultMovie: Movie = {
    id: item.id,
    title: item.title,
    tagline: 'Gran Función en Pantalla Gigante',
    classification: item.fallbackClassification,
    duration: '115 min',
    genre: 'Estreno',
    allGenres: 'Acción, Aventuras',
    rating: '8.4',
    posterUrl: fallbackPosters[item.id] || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600',
    backdropUrl: '',
    synopsis: 'Vive la magia del cine tradicional en el corazón de Jilotepec. Sonido digital envolvente y la mejor dulcería.',
    releaseYear: '2026',
    director: 'Director Cinematográfico',
    actors: 'Reparto estelar',
    trailerKey: null,
    showtimes: item.showtimes,
  };

  try {
    const searchUrl = `${TMDB_BASE}/search/movie?api_key=${TMDB_API_KEY}&language=es-MX&query=${encodeURIComponent(
      item.title
    )}`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return defaultMovie;

    const searchData = (await searchRes.json()) as TmdbSearchResponse;
    const firstResult = searchData.results?.[0];
    if (!firstResult) return defaultMovie;

    const detailUrl = `${TMDB_BASE}/movie/${firstResult.id}?api_key=${TMDB_API_KEY}&language=es-MX&append_to_response=release_dates,credits,videos`;
    const detailRes = await fetch(detailUrl);
    if (!detailRes.ok) return defaultMovie;

    const d = (await detailRes.json()) as TmdbMovieDetailsResponse;

    const mxRelease = d.release_dates?.results?.find((r) => r.iso_3166_1 === 'MX');
    const usRelease = d.release_dates?.results?.find((r) => r.iso_3166_1 === 'US');
    const certRaw = mxRelease?.release_dates?.[0]?.certification ?? usRelease?.release_dates?.[0]?.certification ?? '';

    const director = d.credits?.crew?.find((c) => c.job === 'Director')?.name || 'Director Cinematográfico';
    const actors = d.credits?.cast?.slice(0, 3).map((a) => a.name).join(', ') || 'Reparto estelar';
    const mainGenre = d.genres?.[0]?.name || 'Cine';
    const allGenres = d.genres?.map((g) => g.name).join(', ') || 'Cine';
    const trailer = d.videos?.results?.find((v) => v.site === 'YouTube' && v.type === 'Trailer')?.key || null;

    return {
      id: item.id,
      title: d.title || item.title,
      tagline: d.tagline || defaultMovie.tagline,
      classification: resolveClassification(certRaw, item.fallbackClassification),
      duration: d.runtime ? `${d.runtime} min` : defaultMovie.duration,
      genre: mainGenre,
      allGenres: allGenres,
      rating: d.vote_average ? d.vote_average.toFixed(1) : defaultMovie.rating,
      posterUrl: d.poster_path ? `${TMDB_IMG}${d.poster_path}` : defaultMovie.posterUrl,
      backdropUrl: d.backdrop_path ? `${TMDB_IMG_ORIGINAL}${d.backdrop_path}` : '',
      synopsis: d.overview || defaultMovie.synopsis,
      releaseYear: d.release_date ? d.release_date.split('-')[0] : '2026',
      director: director,
      actors: actors,
      trailerKey: trailer,
      showtimes: item.showtimes,
    };
  } catch {
    return defaultMovie;
  }
}

export const carteleraService = {
  getPromociones(): Promotion[] {
    return initialPromotions;
  },

  async getCarteleraHoy(): Promise<Movie[]> {
    const promises = localCatalog.map((item) => fetchTmdbMovie(item));
    return Promise.all(promises);
  },
};

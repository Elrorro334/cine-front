import { carteleraService } from './carteleraService';

describe('carteleraService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getPromociones retorna la lista de promociones iniciales', () => {
    const promociones = carteleraService.getPromociones();
    expect(promociones.length).toBeGreaterThan(0);
    expect(promociones[0].title).toContain('Miércoles 2x1');
  });

  test('getCarteleraHoy retorna películas desde TMDB si responde exitosamente', async () => {
    const mockNowPlaying = {
      results: [
        {
          id: 101,
          title: 'Película en Vivo',
        },
      ],
    };

    const mockDetails = {
      id: 101,
      title: 'Película en Vivo',
      tagline: 'Estreno 2026',
      overview: 'Sinopsis de estreno',
      runtime: 120,
      vote_average: 8.7,
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      release_date: '2026-10-10',
      genres: [{ id: 28, name: 'Acción' }],
      credits: {
        crew: [{ job: 'Director', name: 'Director Famoso' }],
        cast: [{ name: 'Actor Principal' }],
      },
      release_dates: {
        results: [
          {
            iso_3166_1: 'MX',
            release_dates: [{ certification: 'B' }],
          },
        ],
      },
    };

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockNowPlaying,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockDetails,
      });

    const movies = await carteleraService.getCarteleraHoy();
    expect(movies.length).toBeGreaterThan(0);
    expect(movies[0].title).toBe('Película en Vivo');
    expect(movies[0].director).toBe('Director Famoso');
    expect(movies[0].classification).toBe('B');
  });

  test('getCarteleraHoy retorna el catálogo de respaldo si la API de TMDB falla', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

    const movies = await carteleraService.getCarteleraHoy();
    expect(movies.length).toBeGreaterThan(0);
    expect(movies[0].title).toBe('Caminos del Crimen');
  });
});

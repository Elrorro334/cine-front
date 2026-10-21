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

  test('getCarteleraHoy retorna películas desde la API de .NET si responde exitosamente', async () => {
    const mockApiData = [
      {
        idPelicula: 101,
        titulo: 'Película en Vivo',
        sinopsis: 'Sinopsis desde .NET API',
        duracion: 120,
        clasificacion: 'B',
        director: 'Director Famoso',
        poster_image: 'https://images.unsplash.com/photo-test.jpg',
        funciones: [
          { idFuncion: 1, hora: '16:00', nombreSala: 'Sala 1' },
          { idFuncion: 2, hora: '19:00', nombreSala: 'Sala 1' },
        ],
      },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    });

    const movies = await carteleraService.getCarteleraHoy();
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('Película en Vivo');
    expect(movies[0].director).toBe('Director Famoso');
    expect(movies[0].classification).toBe('B');
    expect(movies[0].duration).toBe('120 min');
    expect(movies[0].synopsis).toBe('Sinopsis desde .NET API');
    expect(movies[0].showtimes).toEqual(['16:00', '19:00']);
  });

  test('getCarteleraHoy envía el parámetro de búsqueda a la API de .NET', async () => {
    const mockApiData = [
      {
        idPelicula: 102,
        titulo: 'Spider-Man',
        sinopsis: 'Aventura arácnida',
        duracion: 130,
        clasificacion: 'A',
        director: 'Sam Raimi',
        poster_image: 'https://images.unsplash.com/spiderman.jpg',
        funciones: [],
      },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiData,
    });

    const movies = await carteleraService.getCarteleraHoy('Spider');
    expect(movies).toHaveLength(1);
    expect(movies[0].title).toBe('Spider-Man');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cartelera?busqueda=Spider'),
      expect.any(Object)
    );
  });

  test('getCarteleraHoy retorna arreglo vacío si la API falla o está vacía', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

    const movies = await carteleraService.getCarteleraHoy();
    expect(movies).toEqual([]);
  });

  test('buscarTmdb retorna lista de resultados desde el backend de .NET', async () => {
    const mockTmdb = [
      {
        tmdbId: 155,
        titulo: 'The Dark Knight',
        sinopsis: 'Batman combate al crimen',
        posterUrl: 'https://image.tmdb.org/t/p/w500/darkknight.jpg',
        releaseYear: '2008',
        rating: 9.0,
      },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockTmdb,
    });

    const results = await carteleraService.buscarTmdb('Dark Knight');
    expect(results).toHaveLength(1);
    expect(results[0].titulo).toBe('The Dark Knight');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cartelera/buscar-tmdb?query=Dark%20Knight'),
      expect.any(Object)
    );
  });

  test('buscarTmdb retorna arreglo vacío si la consulta es en blanco', async () => {
    const results = await carteleraService.buscarTmdb('   ');
    expect(results).toEqual([]);
  });

  test('registrarPelicula envía POST con el DTO al endpoint de .NET', async () => {
    const mockCreated = {
      idPelicula: 50,
      titulo: 'Batman',
      poster_image: 'https://image.tmdb.org/t/p/w500/batman.jpg',
      funciones: [],
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => mockCreated,
    });

    const result = await carteleraService.registrarPelicula({
      titulo: 'Batman',
      sinopsis: 'Sinopsis',
      posterImage: 'https://image.tmdb.org/t/p/w500/batman.jpg',
      horario: '19:00',
      precio: 60,
    });

    expect(result.idPelicula).toBe(50);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/cartelera/registrar'),
      expect.objectContaining({
        method: 'POST',
      })
    );
  });
});

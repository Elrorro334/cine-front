import { taquillaService } from './taquillaService';

global.fetch = jest.fn();

describe('taquillaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getCartelera obtiene la lista de películas activas', async () => {
    const mockCartelera = [
      { idPelicula: 1, titulo: 'Spider-Man', funciones: [] },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCartelera,
    });

    const result = await taquillaService.getCartelera();
    expect(result).toEqual(mockCartelera);
  });
});
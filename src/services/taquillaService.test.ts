import { taquillaService } from './taquillaService';

global.fetch = jest.fn();

describe('taquillaService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getCartelera obtiene la lista de películas activas con y sin filtro', async () => {
    const mockCartelera = [
      { idPelicula: 1, titulo: 'Spider-Man', funciones: [] },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCartelera,
    });

    const result = await taquillaService.getCartelera();
    expect(result).toEqual(mockCartelera);

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCartelera,
    });

    const resultFiltered = await taquillaService.getCartelera('Spider');
    expect(resultFiltered).toEqual(mockCartelera);
  });

  test('getButacasFuncion consulta la disponibilidad de asientos de una función', async () => {
    const mockButacas = {
      idFuncion: 10,
      idSala: 1,
      nombreSala: 'Sala 1',
      precio: 50,
      butacas: [{ idButaca: 1, fila: 'A', numero: 1, codigo: 'A1', estaOcupada: false }],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockButacas,
    });

    const res = await taquillaService.getButacasFuncion(10);
    expect(res.nombreSala).toBe('Sala 1');
    expect(res.butacas).toHaveLength(1);
  });

  test('getProductosDulceria retorna el inventario de dulcería', async () => {
    const mockDulceria = [
      { idProducto: 1, sku: 'PAL-01', nombre: 'Palomitas Grandes', categoria: 'Palomitas', precio: 65, stock: 25 },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDulceria,
    });

    const res = await taquillaService.getProductosDulceria();
    expect(res).toEqual(mockDulceria);
  });

  test('registrarVenta envía la venta y retorna el folio confirmado', async () => {
    const mockConfirmacion = {
      idVenta: 15,
      folio: 'VT-00015',
      total: 100,
      fechaHora: '2026-10-21T18:00:00Z',
      metodoPago: 'Efectivo',
      mensaje: 'Venta registrada con éxito',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfirmacion,
    });

    const res = await taquillaService.registrarVenta({
      idVendedor: 1,
      metodoPago: 'Efectivo',
      items: [{ sku: 'BOL-GEN', nombre: 'Boleto', tipo: 'boleto', cantidad: 2, precio: 50 }],
    });

    expect(res.folio).toBe('VT-00015');
  });

  test('getPreorden valida y obtiene los datos de una preorden QR', async () => {
    const mockPreorden = {
      codigo: 'XILO-2026',
      cliente: 'Juan Perez',
      idFuncion: 10,
      pelicula: 'Spider-Man',
      horario: '18:00',
      boletosGeneral: 2,
      precioBoleto: 50,
      asientos: ['A1', 'A2'],
      combos: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPreorden,
    });

    const res = await taquillaService.getPreorden('XILO-2026');
    expect(res.codigo).toBe('XILO-2026');
  });
});

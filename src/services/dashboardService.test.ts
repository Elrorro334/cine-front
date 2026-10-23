import { dashboardService } from './dashboardService';

global.fetch = jest.fn();

describe('dashboardService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getResumen construye query params y obtiene el dashboard financiero', async () => {
    const mockData = {
      periodo: {
        fechaInicio: '2026-10-15',
        fechaFin: '2026-10-21',
        descripcionSemana: 'Jueves 15/10/2026 al Miércoles 21/10/2026',
        esSemanaActual: true,
      },
      kpis: {
        totalIngresos: 1500,
        totalTransacciones: 5,
        ticketPromedio: 300,
        totalTaquilla: 1000,
        boletosVendidos: 20,
        totalDulceria: 500,
        productosDulceriaVendidos: 8,
        efectivo: { total: 900, cantidadTransacciones: 3, porcentaje: 60 },
        tarjeta: { total: 600, cantidadTransacciones: 2, porcentaje: 40 },
      },
      transacciones: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const res = await dashboardService.getResumen({ offsetSemanas: 0 });
    expect(res.kpis.totalIngresos).toBe(1500);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard/resumen?offsetSemanas=0'),
      expect.any(Object)
    );

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    await dashboardService.getResumen({ fechaInicio: '2026-10-01', fechaFin: '2026-10-07' });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('fechaInicio=2026-10-01&fechaFin=2026-10-07'),
      expect.any(Object)
    );
  });

  test('getSemanaActual obtiene la semana cinematográfica activa', async () => {
    const mockSemana = {
      fechaInicio: '2026-10-15',
      fechaFin: '2026-10-21',
      descripcion: 'Semana actual',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSemana,
    });

    const res = await dashboardService.getSemanaActual();
    expect(res.descripcion).toBe('Semana actual');
  });

  test('exportarTransaccionesCsv descarga el archivo Blob CSV', async () => {
    const fakeBlob = new Blob(['Folio,Total\nVT-00001,100'], { type: 'text/csv' });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      blob: async () => fakeBlob,
    });

    const res = await dashboardService.exportarTransaccionesCsv({
      offsetSemanas: -1,
      fechaInicio: '2026-10-08',
      fechaFin: '2026-10-14',
    });

    expect(res).toBe(fakeBlob);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard/exportar-transacciones?offsetSemanas=-1'),
      expect.any(Object)
    );
  });
});

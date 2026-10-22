import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FinancialDashboardView from './FinancialDashboardView';
import { dashboardService } from '@/services/dashboardService';

jest.mock('@/services/dashboardService', () => ({
  dashboardService: {
    getResumen: jest.fn(),
    exportarTransaccionesCsv: jest.fn(),
  },
}));

describe('FinancialDashboardView Component (HU-10)', () => {
  const mockDashboardData = {
    periodo: {
      fechaInicio: '2026-10-15',
      fechaFin: '2026-10-21',
      descripcionSemana: 'Jueves 15/10/2026 al Miércoles 21/10/2026',
      esSemanaActual: true,
    },
    kpis: {
      totalIngresos: 2500,
      totalTransacciones: 3,
      ticketPromedio: 833.3,
      totalTaquilla: 1500,
      boletosVendidos: 30,
      totalDulceria: 1000,
      productosDulceriaVendidos: 15,
      efectivo: { total: 1500, cantidadTransacciones: 2, porcentaje: 60 },
      tarjeta: { total: 1000, cantidadTransacciones: 1, porcentaje: 40 },
    },
    transacciones: [
      {
        idVenta: 1,
        fechaHora: '2026-10-16T15:30:00Z',
        cajero: 'carlos',
        metodoPago: 'Efectivo',
        tipoTransaccion: 'Taquilla',
        cantidadArticulos: 2,
        resumenDetalle: '2x Boleto Spider-Man',
        total: 100,
      },
      {
        idVenta: 2,
        fechaHora: '2026-10-17T18:00:00Z',
        cajero: 'ana',
        metodoPago: 'Tarjeta Mercado Pago',
        tipoTransaccion: 'Dulcería',
        cantidadArticulos: 1,
        resumenDetalle: '1x Combo Pareja',
        total: 185,
      },
      {
        idVenta: 3,
        fechaHora: '2026-10-18T20:00:00Z',
        cajero: 'rodrigo',
        metodoPago: 'Efectivo',
        tipoTransaccion: 'Mixto',
        cantidadArticulos: 3,
        resumenDetalle: '2x Boleto + 1x Palomitas',
        total: 215,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (dashboardService.getResumen as jest.Mock).mockResolvedValue(mockDashboardData);
  });

  test('renderiza los 4 KPIs financieros y la tabla de transacciones', async () => {
    render(<FinancialDashboardView />);

    await waitFor(() => {
      expect(screen.getByText('$2500.00')).toBeInTheDocument();
    });

    expect(screen.getByText('$1500.00')).toBeInTheDocument();
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
    expect(screen.getByText('VT-00001')).toBeInTheDocument();
    expect(screen.getByText('VT-00002')).toBeInTheDocument();
    expect(screen.getByText('VT-00003')).toBeInTheDocument();
  });

  test('permite cambiar entre semanas cinematográficas y rango personalizado', async () => {
    render(<FinancialDashboardView />);

    await waitFor(() => {
      expect(screen.getByText('VT-00001')).toBeInTheDocument();
    });

    // Cambiar a Semana Anterior (-1)
    fireEvent.click(screen.getByRole('button', { name: /Semana Anterior \(-1\)/i }));

    await waitFor(() => {
      expect(dashboardService.getResumen).toHaveBeenCalledWith({ offsetSemanas: -1 });
    });

    // Cambiar a Rango Personalizado
    fireEvent.click(screen.getByRole('button', { name: /Rango Personalizado/i }));
    const filterBtn = screen.getByRole('button', { name: /^Filtrar$/i });
    fireEvent.click(filterBtn);

    await waitFor(() => {
      expect(dashboardService.getResumen).toHaveBeenCalled();
    });
  });

  test('permite filtrar transacciones por texto, tipo y método de pago', async () => {
    render(<FinancialDashboardView />);

    await waitFor(() => {
      expect(screen.getByText('VT-00001')).toBeInTheDocument();
    });

    // Filtrar por texto (cajero 'ana')
    const searchInput = screen.getByPlaceholderText(/Buscar folio, cajero/i);
    fireEvent.change(searchInput, { target: { value: 'ana' } });

    expect(screen.queryByText('VT-00001')).not.toBeInTheDocument();
    expect(screen.getByText('VT-00002')).toBeInTheDocument();

    // Limpiar texto y filtrar por tipo Taquilla
    fireEvent.change(searchInput, { target: { value: '' } });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Taquilla' } });
    expect(screen.getByText('VT-00001')).toBeInTheDocument();
    expect(screen.queryByText('VT-00002')).not.toBeInTheDocument();

    // Filtrar por método Tarjeta
    fireEvent.change(selects[0], { target: { value: 'todos' } });
    fireEvent.change(selects[1], { target: { value: 'Tarjeta' } });
    expect(screen.getByText('VT-00002')).toBeInTheDocument();
  });

  test('ejecuta la exportación de Excel / CSV al presionar el botón', async () => {
    const fakeBlob = new Blob(['Folio,Total'], { type: 'text/csv' });
    (dashboardService.exportarTransaccionesCsv as jest.Mock).mockResolvedValue(fakeBlob);

    window.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/fake');
    window.URL.revokeObjectURL = jest.fn();

    render(<FinancialDashboardView />);

    await waitFor(() => {
      expect(screen.getByText('VT-00001')).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /Exportar Excel \/ CSV/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(dashboardService.exportarTransaccionesCsv).toHaveBeenCalledWith({ offsetSemanas: 0 });
    });
  });

  test('muestra mensaje de error cuando falla la carga desde el backend', async () => {
    (dashboardService.getResumen as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<FinancialDashboardView />);

    await waitFor(() => {
      expect(
        screen.getByText(/No se pudieron cargar los datos financieros desde el servidor/i)
      ).toBeInTheDocument();
    });
  });
});

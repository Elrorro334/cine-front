import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PosPage from './page';
import { taquillaService } from '@/services/taquillaService';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    getUserSession: jest.fn().mockReturnValue({ idVendedor: 1, nombre: 'Raul', rol: 'Vendedor' }),
    logout: jest.fn(),
  },
}));

jest.mock('@/services/taquillaService', () => ({
  taquillaService: {
    getCartelera: jest.fn(),
    getProductosDulceria: jest.fn(),
    getButacasFuncion: jest.fn(),
    registrarVenta: jest.fn(),
    getPreorden: jest.fn(),
  },
}));

describe('PosPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (taquillaService.getCartelera as jest.Mock).mockResolvedValue([
      {
        idPelicula: 1,
        titulo: 'Spider-Man',
        clasificacion: 'A',
        duracion: 120,
        funciones: [{ idFuncion: 10, hora: '15:00:00', precio: 50 }],
      },
    ]);
    (taquillaService.getProductosDulceria as jest.Mock).mockResolvedValue([
      {
        idProducto: 1,
        sku: 'PAL-01',
        nombre: 'Palomitas Grandes',
        categoria: 'Palomitas',
        precio: 65,
        stock: 20,
      },
    ]);
    (taquillaService.getButacasFuncion as jest.Mock).mockResolvedValue({
      idFuncion: 10,
      idSala: 1,
      nombreSala: 'Sala 1',
      precio: 50,
      butacas: [{ idButaca: 1, fila: 'A', numero: 1, codigo: 'A1', estaOcupada: false }],
    });
    (taquillaService.registrarVenta as jest.Mock).mockResolvedValue({
      idVenta: 100,
      folio: 'VT-00100',
      total: 115,
      fechaHora: '2026-10-21T18:00:00Z',
      metodoPago: 'Efectivo',
      mensaje: 'OK',
    });
  });

  test('renderiza la cartelera y abre el modal de butacas al seleccionar horario', async () => {
    render(<PosPage />);

    expect(screen.getByText('Xilotzin POS')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    const funcionBtn = screen.getByRole('button', { name: '15:00' });
    fireEvent.click(funcionBtn);

    await waitFor(() => {
      expect(taquillaService.getButacasFuncion).toHaveBeenCalledWith(10);
      expect(screen.getAllByText(/Spider-Man/i).length).toBeGreaterThan(0);
    });
  });

  test('permite agregar productos de dulcería y procesar cobro en efectivo', async () => {
    render(<PosPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    // Ir al Paso 2: Dulcería & Combos
    fireEvent.click(screen.getByRole('button', { name: /2\. Dulcería & Combos/i }));

    await waitFor(() => {
      expect(screen.getByText('Palomitas Grandes')).toBeInTheDocument();
    });

    // Agregar palomitas al carrito
    fireEvent.click(screen.getByRole('button', { name: /Agregar/i }));

    // Ir al Paso 3: Cobro
    fireEvent.click(screen.getByRole('button', { name: /Paso 3: Cobrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Confirmar Pago en Efectivo/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pago en Efectivo/i }));

    await waitFor(() => {
      expect(taquillaService.registrarVenta).toHaveBeenCalled();
    });
  });

  test('abre el modal de registro TMDB al hacer clic en + Película (TMDB)', async () => {
    render(<PosPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    const tmdbBtn = screen.getByRole('button', { name: /\+ Película \(TMDB\)/i });
    fireEvent.click(tmdbBtn);

    expect(screen.getByText(/Registrar Película desde TMDB/i)).toBeInTheDocument();
  });
});

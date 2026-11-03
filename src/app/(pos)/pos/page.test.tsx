import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PosPage from './page';
import { taquillaService } from '@/services/taquillaService';
import { PreordenDto } from '@/types/api';

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

const crearPreordenMock = (overrides: Partial<PreordenDto> = {}): PreordenDto => ({
  idPreorden: 5,
  codigo: 'PRE-XIL-001',
  cliente: 'Ana López',
  telefono: '5551234567',
  pelicula: 'Avatar',
  horario: '19:00',
  idFuncion: 20,
  boletosGeneral: 2,
  precioBoleto: 50,
  asientos: [],
  combos: [],
  total: 100,
  fechaCreacion: '2026-10-21',
  vigenciaDias: 8,
  estadoActivo: true,
  ...overrides,
});

describe('PosPage Component', () => {
  const escanearQr = async (codigo: string) => {
    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Escanear QR/i }));
    fireEvent.change(screen.getByPlaceholderText(/Escribir o escanear folio/i), {
      target: { value: codigo },
    });
    fireEvent.click(screen.getByRole('button', { name: /Validar e Ingresar/i }));
  };

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

    fireEvent.click(screen.getByRole('button', { name: 'Butaca A1' }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar a Venta/i }));

    await waitFor(() => {
      expect(screen.getByText(/Spider-Man \(15:00\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Asientos: A1/i)).toBeInTheDocument();
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

  test('al canjear una pre-orden QR exige exactamente sus butacas y agrega combos', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(
      crearPreordenMock({
        combos: [{ nombre: 'Combo Pareja', cantidad: 1, precio: 110 }],
        total: 210,
      })
    );
    (taquillaService.getButacasFuncion as jest.Mock).mockResolvedValue({
      idFuncion: 20,
      idSala: 1,
      nombreSala: 'Sala 1',
      precio: 50,
      butacas: [
        { idButaca: 1, fila: 'A', numero: 1, codigo: 'A1', estaOcupada: false },
        { idButaca: 2, fila: 'A', numero: 2, codigo: 'A2', estaOcupada: false },
        { idButaca: 3, fila: 'A', numero: 3, codigo: 'A3', estaOcupada: false },
      ],
    });

    render(<PosPage />);
    await escanearQr('pre-xil-001');

    await waitFor(() => {
      expect(taquillaService.getPreorden).toHaveBeenCalledWith('PRE-XIL-001');
      expect(taquillaService.getButacasFuncion).toHaveBeenCalledWith(20);
    });

    expect(screen.getByText(/Selecciona exactamente/i)).toBeInTheDocument();

    const confirmar = screen.getByRole('button', { name: /Agregar a Venta/i });
    expect(confirmar).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Butaca A1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Butaca A2' }));

    expect(confirmar).toBeEnabled();
    fireEvent.click(confirmar);

    await waitFor(() => {
      expect(screen.getByText(/Avatar \(19:00\) - Ana López/i)).toBeInTheDocument();
      expect(screen.getByText(/Asientos: A1, A2/i)).toBeInTheDocument();
      expect(screen.getByText('Combo Pareja')).toBeInTheDocument();
    });
  });

  test('rechaza una pre-orden inactiva sin abrir el mapa de butacas', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(
      crearPreordenMock({
        idPreorden: 6,
        codigo: 'PRE-XIL-002',
        estadoActivo: false,
      })
    );

    render(<PosPage />);
    await escanearQr('PRE-XIL-002');

    await waitFor(() => {
      expect(screen.getByText(/cancelada o inactiva/i)).toBeInTheDocument();
    });
    expect(taquillaService.getButacasFuncion).not.toHaveBeenCalled();
  });

  test('rechaza una pre-orden sin boletos para canjear', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(
      crearPreordenMock({
        idPreorden: 7,
        codigo: 'PRE-XIL-004',
        boletosGeneral: 0,
        total: 0,
      })
    );

    render(<PosPage />);
    await escanearQr('PRE-XIL-004');

    await waitFor(() => {
      expect(screen.getByText(/no contiene boletos/i)).toBeInTheDocument();
    });
    expect(taquillaService.getButacasFuncion).not.toHaveBeenCalled();
  });

  test('rechaza un código QR que no existe en la base de datos', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(null);

    render(<PosPage />);
    await escanearQr('PRE-INEXISTENTE');

    await waitFor(() => {
      expect(screen.getByText(/no encontrado en base de datos/i)).toBeInTheDocument();
    });
    expect(taquillaService.getButacasFuncion).not.toHaveBeenCalled();
  });

  test('muestra un mensaje cuando la pre-orden no se puede validar', async () => {
    (taquillaService.getPreorden as jest.Mock).mockRejectedValue(new Error('fallo de red'));

    render(<PosPage />);
    await escanearQr('PRE-XIL-003');

    await waitFor(() => {
      expect(screen.getByText(/Error al validar la pre-orden/i)).toBeInTheDocument();
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

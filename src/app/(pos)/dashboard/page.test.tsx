import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { authService } from '@/services/authService';
import { carteleraService } from '@/services/carteleraService';
import { dashboardService } from '@/services/dashboardService';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    getUserSession: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/services/carteleraService', () => ({
  carteleraService: {
    getCarteleraHoy: jest.fn(),
    buscarTmdb: jest.fn(),
    obtenerDetalleTmdb: jest.fn(),
    registrarPelicula: jest.fn(),
    eliminarPelicula: jest.fn(),
    sincronizarCatalogoBase: jest.fn(),
  },
}));

jest.mock('@/services/dashboardService', () => ({
  dashboardService: {
    getResumen: jest.fn(),
    exportarTransaccionesCsv: jest.fn(),
  },
}));

describe('DashboardPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getUserSession as jest.Mock).mockReturnValue({
      idVendedor: 1,
      nombre: 'Administrador Supremo',
      rol: 'Admin',
    });
    (carteleraService.getCarteleraHoy as jest.Mock).mockResolvedValue([
      {
        id: 1,
        title: 'Spider-Man',
        classification: 'B',
        duration: '130 min',
        director: 'Sam Raimi',
        posterUrl: 'https://image.tmdb.org/t/p/w500/fake.jpg',
        showtimes: ['14:00', '18:00'],
      },
    ]);
    (dashboardService.getResumen as jest.Mock).mockResolvedValue({
      periodo: {
        fechaInicio: '2026-10-15',
        fechaFin: '2026-10-21',
        descripcionSemana: 'Semana Actual',
        esSemanaActual: true,
      },
      kpis: {
        totalIngresos: 1200,
        totalTransacciones: 4,
        ticketPromedio: 300,
        totalTaquilla: 800,
        boletosVendidos: 16,
        totalDulceria: 400,
        productosDulceriaVendidos: 5,
        efectivo: { total: 700, cantidadTransacciones: 2, porcentaje: 58.3 },
        tarjeta: { total: 500, cantidadTransacciones: 2, porcentaje: 41.7 },
      },
      transacciones: [],
    });
  });

  test('redirige a /login si no hay sesión activa', async () => {
    (authService.getUserSession as jest.Mock).mockReturnValue(null);
    render(<DashboardPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  test('redirige a /pos si el usuario no tiene rol de Administrador', async () => {
    (authService.getUserSession as jest.Mock).mockReturnValue({
      idVendedor: 2,
      nombre: 'Cajero Turno',
      rol: 'Cajero',
    });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/pos');
    });
  });

  test('renderiza el panel y permite cambiar al módulo de Películas & Cartelera TMDB', async () => {
    render(<DashboardPage />);

    const tabCartelera = screen.getByRole('button', { name: /Películas & Cartelera TMDB/i });
    expect(tabCartelera).toBeInTheDocument();

    fireEvent.click(tabCartelera);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ej\. Batman, Avatar/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Buscar Título/i })).toBeInTheDocument();
    });
  });

  test('permite buscar títulos en TMDB, seleccionar película y registrarla', async () => {
    (carteleraService.buscarTmdb as jest.Mock).mockResolvedValue([
      {
        tmdbId: 385687,
        titulo: 'Fast X',
        tituloOriginal: 'Fast X',
        sinopsis: 'Dom Toretto y su familia...',
        posterPath: '/fiVW06jE7z9YBoio5v4Y30ND00L.jpg',
        releaseYear: '2023',
        rating: 7.2,
      },
    ]);
    (carteleraService.obtenerDetalleTmdb as jest.Mock).mockResolvedValue({
      tmdbId: 385687,
      titulo: 'Fast X',
      sinopsis: 'Dom Toretto y su familia...',
      duracion: 141,
      clasificacion: 'B',
      director: 'Louis Leterrier',
      posterPath: '/fiVW06jE7z9YBoio5v4Y30ND00L.jpg',
      releaseYear: '2023',
      rating: 7.2,
    });
    (carteleraService.registrarPelicula as jest.Mock).mockResolvedValue({ idPelicula: 99 });

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /Películas & Cartelera TMDB/i }));

    const input = await screen.findByPlaceholderText(/Ej\. Batman, Avatar/i);
    fireEvent.change(input, { target: { value: 'Fast' } });

    const searchBtn = screen.getByRole('button', { name: /Buscar Título/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(carteleraService.buscarTmdb).toHaveBeenCalledWith('Fast');
      expect(screen.getAllByText('Fast X').length).toBeGreaterThan(0);
    });

    // Seleccionar película para configurar horarios
    fireEvent.click(screen.getAllByText('Fast X')[0]);

    await waitFor(() => {
      expect(carteleraService.obtenerDetalleTmdb).toHaveBeenCalledWith(385687);
      expect(screen.getByText(/Paso 2 • Configurar Funciones/i)).toBeInTheDocument();
    });

    // Registrar película en SQL Server
    const saveBtn = screen.getByRole('button', { name: /Registrar en Cartelera SQL Server/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(carteleraService.registrarPelicula).toHaveBeenCalled();
    });
  });

  test('permite sincronizar el catálogo base TMDB con SQL Server', async () => {
    (carteleraService.sincronizarCatalogoBase as jest.Mock).mockResolvedValue([]);
    render(<DashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /Películas & Cartelera TMDB/i }));

    const syncBtn = await screen.findByRole('button', { name: /Sincronizar Catálogo Base TMDB/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(carteleraService.sincronizarCatalogoBase).toHaveBeenCalled();
    });
  });

  test('permite dar de baja una película confirmando la acción', async () => {
    (carteleraService.eliminarPelicula as jest.Mock).mockResolvedValue(true);
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<DashboardPage />);

    fireEvent.click(screen.getByRole('button', { name: /Películas & Cartelera TMDB/i }));

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /Dar de Baja/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(carteleraService.eliminarPelicula).toHaveBeenCalledWith(1);
    });
  });

  test('permite cerrar sesión y redirigir a /login', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(dashboardService.getResumen).toHaveBeenCalled();
    });

    const logoutBtn = screen.getByRole('button', { name: /Cerrar sesión/i });
    fireEvent.click(logoutBtn);

    expect(authService.logout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from './page';
import { authService } from '@/services/authService';
import { carteleraService } from '@/services/carteleraService';

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
  });

  test('redirige a /login si no hay sesión activa', () => {
    (authService.getUserSession as jest.Mock).mockReturnValue(null);
    render(<DashboardPage />);
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  test('renderiza el panel con el módulo de Películas & Cartelera TMDB', async () => {
    render(<DashboardPage />);

    expect(screen.getByText(/Películas & Cartelera TMDB/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej\. Batman, Avatar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Buscar Título/i })).toBeInTheDocument();
  });

  test('permite buscar títulos en TMDB y muestra los resultados', async () => {
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

    render(<DashboardPage />);

    const input = screen.getByPlaceholderText(/Ej\. Batman, Avatar/i);
    fireEvent.change(input, { target: { value: 'Fast' } });

    const searchBtn = screen.getByRole('button', { name: /Buscar Título/i });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(carteleraService.buscarTmdb).toHaveBeenCalledWith('Fast');
      expect(screen.getAllByText('Fast X').length).toBeGreaterThan(0);
    });
  });

  test('permite dar de baja una película confirmando la acción', async () => {
    (carteleraService.eliminarPelicula as jest.Mock).mockResolvedValue(true);
    jest.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole('button', { name: /Dar de Baja/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(carteleraService.eliminarPelicula).toHaveBeenCalledWith(1);
    });
  });

  test('permite cerrar sesión y redirigir a /login', () => {
    render(<DashboardPage />);

    const logoutBtn = screen.getByRole('button', { name: /Cerrar sesión/i });
    fireEvent.click(logoutBtn);

    expect(authService.logout).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});

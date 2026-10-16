import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PosPage from './page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    getUserSession: jest.fn().mockReturnValue({ nombre: 'Raul', rol: 'Vendedor' }),
    logout: jest.fn(),
  },
}));

jest.mock('@/services/taquillaService', () => ({
  taquillaService: {
    getCartelera: jest.fn().mockResolvedValue([
      {
        idPelicula: 1,
        titulo: 'Spider-Man',
        clasificacion: 'A',
        funciones: [{ idFuncion: 10, hora: '15:00:00' }],
      },
    ]),
  },
}));

describe('PosPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      expect(screen.getByText(/Spider-Man/i)).toBeInTheDocument();
    });
  });

  test('abre el modal de registro TMDB al hacer clic en + Película (TMDB)', async () => {
    render(<PosPage />);

    const tmdbBtn = screen.getByRole('button', { name: /\+ Película \(TMDB\)/i });
    fireEvent.click(tmdbBtn);

    expect(screen.getByText(/Registrar Película desde TMDB/i)).toBeInTheDocument();
  });
});
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublicPage from './page';
import { carteleraService } from '@/services/carteleraService';

jest.mock('@/services/carteleraService', () => ({
  carteleraService: {
    getCarteleraHoy: jest.fn(),
    getPromociones: jest.fn(),
  },
}));

describe('PublicPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (carteleraService.getCarteleraHoy as jest.Mock).mockResolvedValue([
      {
        id: 1,
        title: 'Spider-Man',
        originalTitle: 'Spider-Man',
        classification: 'B',
        duration: '120 min',
        genre: 'Acción',
        director: 'Sam Raimi',
        cast: 'Tobey Maguire',
        synopsis: 'El hombre araña.',
        posterUrl: 'https://image.tmdb.org/t/p/w500/spider.jpg',
        rating: 8.5,
        releaseYear: '2026',
        showtimes: ['14:00', '18:00'],
      },
    ]);
    (carteleraService.getPromociones as jest.Mock).mockResolvedValue([
      {
        id: 'promo-1',
        title: '2x1 Miércoles',
        subtitle: 'En todas las salas',
        badge: 'PROMO',
        accentColor: '#E11D2F',
        icon: 'fa-ticket',
      },
    ]);
  });

  test('renderiza la página pública con cartelera y promociones y permite filtrar', async () => {
    render(<PublicPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    // Filtrar por texto que no coincide
    const searchInput = screen.getByPlaceholderText(/Buscar título o género/i);
    fireEvent.change(searchInput, { target: { value: 'NoExiste' } });

    expect(screen.getByText(/No se encontraron películas/i)).toBeInTheDocument();

    // Restablecer filtros
    fireEvent.click(screen.getByRole('button', { name: /Restablecer Filtros/i }));
    expect(screen.getByText('Spider-Man')).toBeInTheDocument();

    // Filtrar por clasificación B
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByText('Spider-Man')).toBeInTheDocument();
  });
});

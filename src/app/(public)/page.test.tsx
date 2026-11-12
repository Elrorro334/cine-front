import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PublicPage from './page';
import { carteleraService } from '@/services/carteleraService';

jest.mock('@/services/carteleraService', () => ({
  carteleraService: {
    getCarteleraHoy: jest.fn(),
    getPromociones: jest.fn(),
    getDulceriaPublica: jest.fn(),
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
    (carteleraService.getDulceriaPublica as jest.Mock).mockResolvedValue([
      {
        idProducto: 1,
        sku: '7501001',
        nombre: 'Palomitas Grandes',
        categoria: 'Snacks',
        precio: 50,
        stock: 20,
      },
      {
        idProducto: 2,
        sku: '7501002',
        nombre: 'Refresco 600ml',
        categoria: 'Bebidas',
        precio: 35,
        stock: 0,
      },
    ]);
  });

  test('renderiza la página pública con cartelera, promociones y dulcería y permite filtrar', async () => {
    render(<PublicPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
      expect(screen.getByText('Palomitas Grandes')).toBeInTheDocument();
    });

    // Verificar sección Dulcería & Combos (#dulceria) y filtro por categoría
    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
    expect(screen.getByText('Refresco 600ml')).toBeInTheDocument();
    expect(screen.queryByText('Palomitas Grandes')).not.toBeInTheDocument();

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

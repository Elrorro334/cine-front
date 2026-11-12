import { render, screen, waitFor } from '@testing-library/react';
import DulceriaPage from './page';
import { carteleraService } from '@/services/carteleraService';

jest.mock('@/services/carteleraService', () => ({
  carteleraService: {
    getDulceriaPublica: jest.fn(),
  },
}));

describe('DulceriaPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renderiza el encabezado oficial y carga los productos de dulcería', async () => {
    (carteleraService.getDulceriaPublica as jest.Mock).mockResolvedValue([
      {
        idProducto: 1,
        sku: 'SNK-01',
        nombre: 'Palomitas Jumbo Mantequilla',
        categoria: 'Palomitas',
        precio: 85,
        stock: 20,
        descripcionDescuento: 'Mantequilla extra incluida',
      },
      {
        idProducto: 2,
        sku: 'CMB-01',
        nombre: 'Combo Pareja Xilotzin',
        categoria: 'Combos',
        precio: 180,
        stock: 15,
        descripcionDescuento: '2 Refrescos + 1 Palomitas Grandes',
      },
    ]);

    render(<DulceriaPage />);

    expect(screen.getByRole('heading', { level: 1, name: /DULCERÍA & COMBOS/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Palomitas Jumbo Mantequilla')).toBeInTheDocument();
      expect(screen.getByText('Combo Pareja Xilotzin')).toBeInTheDocument();
    });

    expect(carteleraService.getDulceriaPublica).toHaveBeenCalledTimes(1);
  });
});

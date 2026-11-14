import { render, screen, fireEvent, act } from '@testing-library/react';
import PublicNavbar from './PublicNavbar';

describe('PublicNavbar Component', () => {
  beforeEach(() => {
    document.documentElement.dataset.cineTheme = 'traditional';
  });

  test('renderiza enlaces principales a Cartelera, Dulcería & Combos y Pre-orden QR', () => {
    render(<PublicNavbar />);

    expect(screen.getByText('Cartelera')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dulcería & Combos/i })).toHaveAttribute('href', '/dulceria');
    expect(screen.getByText('Pre-orden QR')).toBeInTheDocument();
  });

  test('actualiza el tema visual cuando cambia el evento xilotzin_theme_change', () => {
    render(<PublicNavbar />);

    act(() => {
      document.documentElement.dataset.cineTheme = 'halloween';
      window.dispatchEvent(new Event('xilotzin_theme_change'));
    });

    expect(screen.getByText('Noches de Terror')).toBeInTheDocument();
    expect(screen.getByText(/¡NOCHES DE TERROR EN XILOTZIN!/i)).toBeInTheDocument();
  });

  test('permite alternar el menú móvil', () => {
    render(<PublicNavbar />);

    const menuButton = screen.getByLabelText('Abrir menú');
    fireEvent.click(menuButton);

    const posLinks = screen.getAllByRole('link', { name: /Acceso Sistema POS/i });
    expect(posLinks.length).toBeGreaterThan(0);
  });
});

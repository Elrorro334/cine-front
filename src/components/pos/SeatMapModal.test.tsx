import { render, screen, fireEvent } from '@testing-library/react';
import SeatMapModal from './SeatMapModal';

describe('SeatMapModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <SeatMapModal
        isOpen={false}
        onClose={mockOnClose}
        peliculaTitle="Spider-Man"
        horario="15:00"
        onConfirmSeats={mockOnConfirm}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renderiza el modal con el titulo de la pelicula y permite seleccionar butaca', () => {
    render(
      <SeatMapModal
        isOpen={true}
        onClose={mockOnClose}
        peliculaTitle="Spider-Man"
        horario="15:00"
        onConfirmSeats={mockOnConfirm}
      />
    );

    expect(screen.getByText('Spider-Man')).toBeInTheDocument();

    // Como cada fila (A, B, C...) tiene un botón "1", obtenemos la lista y elegimos el primero (A1)
    const buttonsNumber1 = screen.getAllByRole('button', { name: '1' });
    fireEvent.click(buttonsNumber1[0]);

    // Confirmar selección
    const confirmBtn = screen.getByRole('button', { name: /Agregar a Venta/i });
    fireEvent.click(confirmBtn);

    expect(mockOnConfirm).toHaveBeenCalledWith(['A1']);
  });
});
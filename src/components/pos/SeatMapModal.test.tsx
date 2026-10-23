import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SeatMapModal from './SeatMapModal';
import { taquillaService } from '@/services/taquillaService';

jest.mock('@/services/taquillaService', () => ({
  taquillaService: {
    getButacasFuncion: jest.fn(),
  },
}));

describe('SeatMapModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (taquillaService.getButacasFuncion as jest.Mock).mockResolvedValue({
      idFuncion: 10,
      idSala: 1,
      nombreSala: 'Sala 1',
      precio: 50,
      butacas: [
        { idButaca: 1, fila: 'A', numero: 1, codigo: 'A1', estaOcupada: false },
        { idButaca: 2, fila: 'A', numero: 2, codigo: 'A2', estaOcupada: true },
        { idButaca: 3, fila: 'B', numero: 1, codigo: 'B1', estaOcupada: false },
      ],
    });
  });

  test('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <SeatMapModal
        isOpen={false}
        onClose={mockOnClose}
        peliculaTitle="Spider-Man"
        horario="15:00"
        idFuncion={10}
        onConfirmSeats={mockOnConfirm}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renderiza el modal con el titulo de la pelicula y permite seleccionar y deseleccionar butaca', async () => {
    render(
      <SeatMapModal
        isOpen={true}
        onClose={mockOnClose}
        peliculaTitle="Spider-Man"
        horario="15:00"
        idFuncion={10}
        onConfirmSeats={mockOnConfirm}
      />
    );

    expect(screen.getByText('Spider-Man')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '1' }).length).toBeGreaterThan(0);
    });

    const buttonsNumber1 = screen.getAllByRole('button', { name: '1' });
    // Seleccionar A1
    fireEvent.click(buttonsNumber1[0]);
    expect(screen.getByText('A1')).toBeInTheDocument();

    // Deseleccionar A1 y volver a seleccionar
    fireEvent.click(buttonsNumber1[0]);
    expect(screen.getByText('Ninguna')).toBeInTheDocument();

    fireEvent.click(buttonsNumber1[0]);

    // Confirmar selección
    const confirmBtn = screen.getByRole('button', { name: /Agregar a Venta/i });
    fireEvent.click(confirmBtn);

    expect(mockOnConfirm).toHaveBeenCalledWith(['A1']);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('permite asignar automaticamente la primera butaca libre', async () => {
    render(
      <SeatMapModal
        isOpen={true}
        onClose={mockOnClose}
        peliculaTitle="Spider-Man"
        horario="15:00"
        idFuncion={10}
        onConfirmSeats={mockOnConfirm}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '1' }).length).toBeGreaterThan(0);
    });

    const autoBtn = screen.getByRole('button', { name: /Asignar Auto/i });
    fireEvent.click(autoBtn);

    expect(screen.getByText('A1')).toBeInTheDocument();
  });
});

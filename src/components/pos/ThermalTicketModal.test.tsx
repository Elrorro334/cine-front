import { render, screen, fireEvent } from '@testing-library/react';
import ThermalTicketModal from './ThermalTicketModal';

describe('ThermalTicketModal Component', () => {
  const mockOnNewSale = jest.fn();

  test('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <ThermalTicketModal
        isOpen={false}
        folio="VT-1001"
        items={[]}
        total={0}
        metodoPago="Efectivo"
        onNewSale={mockOnNewSale}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('muestra el folio, total e items correctamente', () => {
    render(
      <ThermalTicketModal
        isOpen={true}
        folio="VT-1001"
        items={[{ nombre: 'Boleto Spider-Man', cantidad: 2, precio: 50 }]}
        total={100}
        metodoPago="Efectivo"
        onNewSale={mockOnNewSale}
      />
    );

    expect(screen.getByText(/FOLIO: VT-1001/i)).toBeInTheDocument();
    expect(screen.getByText(/\$100.00 MXN/i)).toBeInTheDocument();

    const btnNuevaVenta = screen.getByRole('button', { name: /Nueva Venta/i });
    fireEvent.click(btnNuevaVenta);
    expect(mockOnNewSale).toHaveBeenCalled();
  });
});
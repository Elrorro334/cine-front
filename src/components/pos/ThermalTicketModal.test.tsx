import { render, screen, fireEvent } from '@testing-library/react';
import ThermalTicketModal from './ThermalTicketModal';

describe('ThermalTicketModal Component (HU-09 / Mockup 14)', () => {
  const mockOnNewSale = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test('muestra el RFC del cine, folio, desglose con butacas, recibido/cambio y código de barras (Mockup 14)', () => {
    const printSpy = jest.spyOn(globalThis, 'print').mockImplementation(() => {});

    render(
      <ThermalTicketModal
        isOpen={true}
        ticket={{
          idVenta: 8292,
          folio: 'VT-8292',
          total: 115,
          metodoPago: 'Efectivo',
          montoRecibido: 200,
          cambio: 85,
          rfcCine: 'CTX-260414-9X0',
          codigoBarrasTicket: '7501092840192',
          fechaVenta: '2026-04-16T14:53:46',
          items: [
            {
              sku: 'BOL-GEN',
              nombre: 'Boleto General: Terrifier 3 (12:30)',
              tipo: 'boleto',
              cantidad: 1,
              precio: 50,
              asientos: ['C1'],
              nombreSala: 'SALA 1',
            },
            {
              sku: '7501003',
              nombre: 'Nachos con Queso',
              tipo: 'dulceria',
              cantidad: 1,
              precio: 65,
            },
          ],
        }}
        onNewSale={mockOnNewSale}
      />
    );

    expect(screen.getByText(/CINE TEATRO XILOTZIN/i)).toBeInTheDocument();
    expect(screen.getByText(/RFC: CTX-260414-9X0/i)).toBeInTheDocument();
    expect(screen.getByText(/FOLIO: VT-8292/i)).toBeInTheDocument();
    expect(screen.getByText(/SALA 1 • BUTACAS: C1/i)).toBeInTheDocument();
    expect(screen.getByText(/\$115\.00 MXN/i)).toBeInTheDocument();
    expect(screen.getByText(/\$200 \/ \$85\.00/i)).toBeInTheDocument();
    expect(screen.getByText('7501092840192')).toBeInTheDocument();

    const btnImprimir = screen.getByRole('button', { name: /IMPRIMIR/i });
    fireEvent.click(btnImprimir);
    expect(printSpy).toHaveBeenCalled();

    const btnNuevaVenta = screen.getByRole('button', { name: /NUEVA VENTA/i });
    fireEvent.click(btnNuevaVenta);
    expect(mockOnNewSale).toHaveBeenCalled();

    printSpy.mockRestore();
  });
});

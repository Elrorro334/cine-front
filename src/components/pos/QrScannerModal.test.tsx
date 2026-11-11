import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QrScannerModal from './QrScannerModal';

describe('QrScannerModal Component (HU-08 / Mockup 15)', () => {
  const mockOnClose = jest.fn();
  const mockOnScanSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <QrScannerModal isOpen={false} onClose={mockOnClose} onScanSuccess={mockOnScanSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renderiza el visor óptico Mockup 15 y permite ingresar y validar un código QR manualmente', async () => {
    render(
      <QrScannerModal isOpen={true} onClose={mockOnClose} onScanSuccess={mockOnScanSuccess} />
    );

    expect(screen.getByText(/HARDWARE \/ ESCÁNER DE PRE-ORDEN/i)).toBeInTheDocument();
    expect(screen.getByText(/LECTURA DE CÓDIGO QR EN CAJA/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reactivar Cámara/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Subir Archivo QR/i })).toBeInTheDocument();

    const input = screen.getByLabelText(/Escribir o escanear folio/i);
    fireEvent.change(input, { target: { value: 'pre-xil-84920' } });

    const btn = screen.getByRole('button', { name: /VALIDAR Y CARGAR EN CAJA/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockOnScanSuccess).toHaveBeenCalledWith('PRE-XIL-84920');
    });
  });

  test('permite seleccionar una pre-orden activa desde el listado rápido y subir archivo QR', async () => {
    render(
      <QrScannerModal
        isOpen={true}
        onClose={mockOnClose}
        onScanSuccess={mockOnScanSuccess}
        preordenesActivas={[
          {
            idPreorden: 1,
            codigo: 'PRE-XIL-99001',
            cliente: 'Carlos Ruiz',
            telefono: '5512345678',
            pelicula: 'Terrifier 3',
            horario: '12:30',
            idFuncion: 10,
            boletosGeneral: 1,
            precioBoleto: 50,
            asientos: [],
            combos: [],
            total: 115,
            fechaCreacion: '2026-10-20',
            vigenciaDias: 12,
            estadoActivo: true,
          },
        ]}
      />
    );

    const chipBtn = screen.getByRole('button', { name: /PRE-XIL-99001/i });
    fireEvent.click(chipBtn);

    const fileInput = screen.getByLabelText(/Archivo de imagen QR/i);
    const fakeFile = new File(['qr'], 'ticket_PRE-XIL-84920.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [fakeFile] } });

    await waitFor(() => {
      expect(mockOnScanSuccess).toHaveBeenCalledWith('PRE-XIL-84920');
    });
  });
});

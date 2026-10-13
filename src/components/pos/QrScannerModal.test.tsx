import { render, screen, fireEvent } from '@testing-library/react';
import QrScannerModal from './QrScannerModal';

describe('QrScannerModal Component', () => {
  const mockOnClose = jest.fn();
  const mockOnScanSuccess = jest.fn();

  test('no se renderiza si isOpen es false', () => {
    const { container } = render(
      <QrScannerModal isOpen={false} onClose={mockOnClose} onScanSuccess={mockOnScanSuccess} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('permite ingresar y validar un código QR manualmente', () => {
    render(
      <QrScannerModal isOpen={true} onClose={mockOnClose} onScanSuccess={mockOnScanSuccess} />
    );

    const input = screen.getByPlaceholderText(/Escribir o escanear folio/i);
    fireEvent.change(input, { target: { value: 'PRE-XIL-12345' } });

    // Se actualizó el texto que busca Testing Library para coincidir con el componente
    const btn = screen.getByRole('button', { name: /Validar e Ingresar/i });
    fireEvent.click(btn);

    expect(mockOnScanSuccess).toHaveBeenCalledWith('PRE-XIL-12345');
  });
});
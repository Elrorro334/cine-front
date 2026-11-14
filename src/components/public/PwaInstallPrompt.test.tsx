import { render, screen, fireEvent, act } from '@testing-library/react';
import PwaInstallPrompt from './PwaInstallPrompt';

describe('PwaInstallPrompt Component', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test('no se muestra inicialmente si el navegador no emite beforeinstallprompt', () => {
    render(<PwaInstallPrompt />);
    expect(screen.queryByText(/Descargar Cine Xilotzin/i)).toBeNull();
  });

  test('se muestra cuando el navegador dispara el evento beforeinstallprompt', () => {
    render(<PwaInstallPrompt />);

    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: jest.Mock;
      userChoice: Promise<{ outcome: string; platform: string }>;
    };
    mockPromptEvent.prompt = jest.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(screen.getByText(/Descargar Cine Xilotzin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Instalar App/i })).toBeInTheDocument();
  });

  test('ejecuta prompt() al hacer clic en Instalar App', async () => {
    render(<PwaInstallPrompt />);

    const mockPrompt = jest.fn().mockResolvedValue(undefined);
    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: jest.Mock;
      userChoice: Promise<{ outcome: string; platform: string }>;
    };
    mockPromptEvent.prompt = mockPrompt;
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    const installBtn = screen.getByRole('button', { name: /Instalar App/i });

    await act(async () => {
      fireEvent.click(installBtn);
    });

    expect(mockPrompt).toHaveBeenCalled();
  });

  test('se oculta cuando el usuario presiona "Ahora no" o el botón de cerrar', () => {
    render(<PwaInstallPrompt />);

    const mockPromptEvent = new Event('beforeinstallprompt') as Event & {
      prompt: jest.Mock;
      userChoice: Promise<{ outcome: string; platform: string }>;
    };
    mockPromptEvent.prompt = jest.fn();
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'dismissed', platform: 'web' });

    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(screen.getByText(/Descargar Cine Xilotzin/i)).toBeInTheDocument();

    const dismissBtn = screen.getByText('Ahora no');
    fireEvent.click(dismissBtn);

    expect(screen.queryByText(/Descargar Cine Xilotzin/i)).toBeNull();
  });

  test('no se muestra si la aplicación ya está instalada en modo standalone', () => {
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query.includes('standalone'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<PwaInstallPrompt />);

    const mockPromptEvent = new Event('beforeinstallprompt');
    act(() => {
      window.dispatchEvent(mockPromptEvent);
    });

    expect(screen.queryByText(/Descargar Cine Xilotzin/i)).toBeNull();
  });
});

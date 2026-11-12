import React, { useState } from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import ThemeStylesheetLoader, {
  applyThemeStylesheet,
  broadcastThemeUpdate,
  isValidStaticThemePath,
} from './ThemeStylesheetLoader';
import { configuracionService } from '@/services/configuracionService';
import { TematicaSitioDto } from '@/types/configuracion';

jest.mock('@/services/configuracionService', () => {
  const actual = jest.requireActual('@/services/configuracionService');
  return {
    ...actual,
    configuracionService: {
      ...actual.configuracionService,
      getTematicaActiva: jest.fn(),
      getTematicasStreamUrl: jest.fn(() => 'http://localhost:5203/api/tematicas/stream'),
    },
  };
});

class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, ((evt: MessageEvent<string>) => void)[]> = {};
  close = jest.fn();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, callback: (evt: MessageEvent<string>) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, data: unknown) {
    const callbacks = this.listeners[event] || [];
    const evt = new MessageEvent('message', { data: JSON.stringify(data) });
    for (const cb of callbacks) {
      cb(evt);
    }
  }
}

describe('ThemeStylesheetLoader (Escenario 3: Cero Downtime)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockEventSource.instances = [];
    document.head.innerHTML = '';
    const link = document.createElement('link');
    link.id = 'theme-stylesheet';
    link.rel = 'stylesheet';
    link.href = '/css/themes/classic.min.css';
    document.head.appendChild(link);

    Object.defineProperty(window, 'EventSource', {
      writable: true,
      configurable: true,
      value: MockEventSource,
    });
  });

  test('isValidStaticThemePath valida rutas seguras de temas estáticos', () => {
    expect(isValidStaticThemePath('/css/themes/halloween.min.css')).toBe(true);
    expect(isValidStaticThemePath('https://evil.com/theme.css')).toBe(false);
    expect(isValidStaticThemePath(null)).toBe(false);
  });

  test('actualiza href del link#theme-stylesheet vía SSE sin recargar ni perder estado de sesión', async () => {
    const classicTheme: TematicaSitioDto = {
      id: 1,
      nombreTematica: 'Xilotzin Clásico',
      claveIdentificadora: 'theme-classic',
      esActiva: true,
      rutaArchivoCss: '/css/themes/classic.min.css',
      paletaColoresJson: '{}',
      tipografia: 'Playfair Display',
      icono: 'fa-clapperboard',
    };
    const halloweenTheme: TematicaSitioDto = {
      id: 2,
      nombreTematica: 'Noche de Terror',
      claveIdentificadora: 'theme-halloween',
      esActiva: true,
      rutaArchivoCss: '/css/themes/halloween.min.css',
      paletaColoresJson: '{}',
      tipografia: 'Cinzel',
      icono: 'fa-ghost',
    };

    (configuracionService.getTematicaActiva as jest.Mock).mockResolvedValue(classicTheme);

    function StatefulPublicApp() {
      const [sessionCounter, setSessionCounter] = useState(0);
      return (
        <div>
          <ThemeStylesheetLoader />
          <span data-testid="session-counter">{sessionCounter}</span>
          <button type="button" onClick={() => setSessionCounter((c) => c + 1)}>
            Incrementar Estado
          </button>
        </div>
      );
    }

    render(<StatefulPublicApp />);

    fireEvent.click(screen.getByRole('button', { name: /Incrementar Estado/i }));
    expect(screen.getByTestId('session-counter')).toHaveTextContent('1');

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    act(() => {
      MockEventSource.instances[0].emit('theme-updated', halloweenTheme);
    });

    const linkEl = document.getElementById('theme-stylesheet') as HTMLLinkElement;
    expect(linkEl.getAttribute('href')).toBe('/css/themes/halloween.min.css');
    expect(document.documentElement.dataset.cineTheme).toBe('theme-halloween');
    // El estado en memoria de la sesión permanece intacto (cero reload)
    expect(screen.getByTestId('session-counter')).toHaveTextContent('1');
  });

  test('applyThemeStylesheet crea la etiqueta link si no existe y broadcastThemeUpdate notifica', () => {
    document.head.innerHTML = '';
    const christmasTheme: TematicaSitioDto = {
      id: 3,
      nombreTematica: 'Navideño',
      claveIdentificadora: 'theme-christmas',
      esActiva: true,
      rutaArchivoCss: '/css/themes/christmas.min.css',
      paletaColoresJson: '{}',
      tipografia: 'Playfair Display',
      icono: 'fa-snowflake',
    };

    applyThemeStylesheet(christmasTheme);
    const created = document.getElementById('theme-stylesheet') as HTMLLinkElement;
    expect(created).not.toBeNull();
    expect(created.getAttribute('href')).toBe('/css/themes/christmas.min.css');

    const listener = jest.fn();
    window.addEventListener('xilotzin-theme-updated', listener);
    broadcastThemeUpdate(christmasTheme);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener('xilotzin-theme-updated', listener);
  });

  test('sincroniza cambios por BroadcastChannel y polling periódico', async () => {
    jest.useFakeTimers();

    const postMessageMock = jest.fn();
    const closeMock = jest.fn();
    const instances: { onmessage: ((evt: MessageEvent<TematicaSitioDto>) => void) | null }[] = [];

    class MockBroadcastChannel {
      onmessage: ((evt: MessageEvent<TematicaSitioDto>) => void) | null = null;
      postMessage = postMessageMock;
      close = closeMock;
      constructor() {
        instances.push(this);
      }
    }

    Object.defineProperty(window, 'BroadcastChannel', {
      writable: true,
      configurable: true,
      value: MockBroadcastChannel,
    });

    const patriasTheme: TematicaSitioDto = {
      id: 4,
      nombreTematica: 'Fiestas Patrias',
      claveIdentificadora: 'theme-patrias',
      esActiva: true,
      rutaArchivoCss: '/css/themes/patrias.min.css',
      paletaColoresJson: '{}',
      tipografia: 'Playfair Display',
      icono: 'fa-flag',
    };

    const christmasTheme: TematicaSitioDto = {
      id: 3,
      nombreTematica: 'Navideño',
      claveIdentificadora: 'theme-christmas',
      esActiva: true,
      rutaArchivoCss: '/css/themes/christmas.min.css',
      paletaColoresJson: '{}',
      tipografia: 'Playfair Display',
      icono: 'fa-snowflake',
    };

    (configuracionService.getTematicaActiva as jest.Mock)
      .mockResolvedValueOnce(patriasTheme)
      .mockResolvedValueOnce(christmasTheme);

    const { unmount } = render(<ThemeStylesheetLoader />);

    await waitFor(() => {
      const linkEl = document.getElementById('theme-stylesheet') as HTMLLinkElement;
      expect(linkEl.getAttribute('href')).toBe('/css/themes/patrias.min.css');
    });

    // Simular mensaje BroadcastChannel
    act(() => {
      instances[0]?.onmessage?.(
        new MessageEvent('message', { data: christmasTheme })
      );
    });
    expect(
      (document.getElementById('theme-stylesheet') as HTMLLinkElement).getAttribute('href')
    ).toBe('/css/themes/christmas.min.css');

    // Simular broadcastThemeUpdate con BroadcastChannel activo y evento custom
    broadcastThemeUpdate(patriasTheme);
    expect(postMessageMock).toHaveBeenCalledWith(patriasTheme);

    // Avanzar ciclo de polling de 15s
    await act(async () => {
      jest.advanceTimersByTime(15000);
    });

    expect(configuracionService.getTematicaActiva).toHaveBeenCalledTimes(2);
    unmount();
    expect(closeMock).toHaveBeenCalled();

    jest.useRealTimers();
  });
});

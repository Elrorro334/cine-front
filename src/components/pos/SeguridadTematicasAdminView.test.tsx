import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SeguridadTematicasAdminView from './SeguridadTematicasAdminView';
import { ApiError } from '@/lib/apiClient';
import { configuracionService } from '@/services/configuracionService';
import { ConfiguracionSeguridadDto, TematicaSitioDto } from '@/types/configuracion';

jest.mock('@/services/configuracionService', () => ({
  THEME_BROADCAST_CHANNEL: 'xilotzin_theme_channel',
  THEME_CUSTOM_EVENT: 'xilotzin-theme-updated',
  configuracionService: {
    getConfiguracionSeguridad: jest.fn(),
    actualizarConfiguracionSeguridad: jest.fn(),
    getTematicas: jest.fn(),
    activarTematica: jest.fn(),
  },
}));

const baseConfig: ConfiguracionSeguridadDto = {
  id: 1,
  sucursalId: 1,
  sucursalNombre: 'Cine Teatro Xilotzin - Matriz Jilotepec',
  ipDefecto: '192.168.1.100',
  ipAutorizada: '192.168.1.100',
  horarioInicioCajeros: '08:00:00',
  horarioFinCajeros: '23:00:00',
  autorizarExcepcionHorasExtras: false,
  fechaUltimaModificacion: '2026-11-11T12:00:00',
  usuarioModificoId: 1,
  ipClienteDetectada: '192.168.1.10',
  mismaSubredQueCliente: true,
  turnosLaborales: [
    { id: 1, nombreTurno: 'Matutino', horaInicio: '08:00:00', horaFin: '15:30:00' },
    { id: 2, nombreTurno: 'Vespertino', horaInicio: '15:30:00', horaFin: '23:00:00' },
  ],
};

const baseTematicas: TematicaSitioDto[] = [
  {
    id: 1,
    nombreTematica: 'Xilotzin Clásico',
    claveIdentificadora: 'theme-classic',
    esActiva: true,
    fechaActivacion: '2026-11-10T10:00:00',
    rutaArchivoCss: '/css/themes/classic.min.css',
    paletaColoresJson: '{"primary":"#E11D2F","secondary":"#DCA54C","background":"#0A0A0A"}',
    tipografia: 'Playfair Display & Montserrat',
    icono: 'fa-clapperboard',
  },
  {
    id: 2,
    nombreTematica: 'Noche de Terror',
    claveIdentificadora: 'theme-halloween',
    esActiva: false,
    fechaActivacion: null,
    rutaArchivoCss: '/css/themes/halloween.min.css',
    paletaColoresJson: '{"primary":"#FF6D00","secondary":"#9333EA","background":"#09050F"}',
    tipografia: 'Cinzel & Montserrat',
    icono: 'fa-ghost',
  },
  {
    id: 3,
    nombreTematica: 'Navideño',
    claveIdentificadora: 'theme-christmas',
    esActiva: false,
    fechaActivacion: null,
    rutaArchivoCss: '/css/themes/christmas.min.css',
    paletaColoresJson: '{"primary":"#DC2626","secondary":"#16A34A","background":"#07110C"}',
    tipografia: 'Playfair Display & Montserrat',
    icono: 'fa-snowflake',
  },
  {
    id: 4,
    nombreTematica: 'Fiestas Patrias',
    claveIdentificadora: 'theme-patrias',
    esActiva: false,
    fechaActivacion: null,
    rutaArchivoCss: '/css/themes/patrias.min.css',
    paletaColoresJson: '{"primary":"#006847","secondary":"#CE1126","background":"#090D0B"}',
    tipografia: 'Playfair Display & Montserrat',
    icono: 'fa-flag',
  },
];

describe('SeguridadTematicasAdminView (Mockup 18 y Mockup 19)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.head.innerHTML = '<link id="theme-stylesheet" rel="stylesheet" href="/css/themes/classic.min.css" />';
    (configuracionService.getConfiguracionSeguridad as jest.Mock).mockResolvedValue(baseConfig);
    (configuracionService.getTematicas as jest.Mock).mockResolvedValue(baseTematicas);
  });

  test('renderiza paneles de Seguridad IP y las 4 temáticas estacionales', async () => {
    render(<SeguridadTematicasAdminView />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Control de Accesos y Seguridad IP/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^Motor de Temáticas Estacionales$/i })).toBeInTheDocument();

    });

    expect(screen.getByText('Xilotzin Clásico')).toBeInTheDocument();
    expect(screen.getByText('Noche de Terror')).toBeInTheDocument();
    expect(screen.getByText('Navideño')).toBeInTheDocument();
    expect(screen.getByText('Fiestas Patrias')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.10')).toBeInTheDocument();
  });

  test('Escenario 1 y 2: actualiza IP a 192.168.1.200 y activa toggle de horas extras', async () => {
    (configuracionService.actualizarConfiguracionSeguridad as jest.Mock).mockResolvedValue({
      ...baseConfig,
      ipAutorizada: '192.168.1.200',
      autorizarExcepcionHorasExtras: true,
    });

    render(<SeguridadTematicasAdminView />);

    const ipInput = await screen.findByLabelText(/IP Autorizada de Sucursal/i);
    fireEvent.change(ipInput, { target: { value: '192.168.1.200' } });

    const toggle = screen.getByRole('switch', { name: /Autorizar Excepción \/ Horas Extras/i });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    const saveBtn = screen.getByRole('button', { name: /Guardar Configuración de Seguridad/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(configuracionService.actualizarConfiguracionSeguridad).toHaveBeenCalledWith({
        sucursalId: 1,
        ipAutorizada: '192.168.1.200',
        horarioInicioCajeros: '08:00',
        horarioFinCajeros: '23:00',
        autorizarExcepcionHorasExtras: true,
        confirmarCambioRed: false,
      });
    });

    expect(
      await screen.findByText(/Los cajeros ahora se validan contra la IP 192.168.1.200/i)
    ).toBeInTheDocument();
  });

  test('Fail-Safe: solicita confirmación explícita ante 409 de subred distinta y reintenta confirmado', async () => {
    (configuracionService.actualizarConfiguracionSeguridad as jest.Mock)
      .mockRejectedValueOnce(
        new ApiError(409, 'Subred distinta', {
          requiereConfirmacion: true,
          ipClienteDetectada: '192.168.1.10',
          ipSolicitada: '10.0.0.50',
          message: 'La IP pertenece a otra subred.',
        })
      )
      .mockResolvedValueOnce({
        ...baseConfig,
        ipAutorizada: '10.0.0.50',
        mismaSubredQueCliente: false,
      });

    render(<SeguridadTematicasAdminView />);

    const ipInput = await screen.findByLabelText(/IP Autorizada de Sucursal/i);
    fireEvent.change(ipInput, { target: { value: '10.0.0.50' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar Configuración de Seguridad/i }));

    const confirmBtn = await screen.findByRole('button', {
      name: /Confirmar Cambio de Red y Guardar/i,
    });
    expect(screen.getByText(/Protección Fail-Safe: Subred Diferente Detectada/i)).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(configuracionService.actualizarConfiguracionSeguridad).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ipAutorizada: '10.0.0.50',
          confirmarCambioRed: true,
        })
      );
    });
  });

  test('Escenario 3: activa Noche de Terror y actualiza link#theme-stylesheet dinámicamente', async () => {
    (configuracionService.activarTematica as jest.Mock).mockResolvedValue({
      ...baseTematicas[1],
      esActiva: true,
      fechaActivacion: '2026-11-11T13:00:00',
    });

    render(<SeguridadTematicasAdminView />);

    await waitFor(() => {
      expect(screen.getByText('Noche de Terror')).toBeInTheDocument();
    });

    const activateButtons = screen.getAllByRole('button', {
      name: /Activar en el Sitio Público/i,
    });
    fireEvent.click(activateButtons[0]);

    await waitFor(() => {
      expect(configuracionService.activarTematica).toHaveBeenCalledWith(2);
    });

    const linkEl = document.getElementById('theme-stylesheet') as HTMLLinkElement;
    expect(linkEl.getAttribute('href')).toBe('/css/themes/halloween.min.css');
    expect(await screen.findByText(/Temática "Noche de Terror" activada/i)).toBeInTheDocument();
  });

  test('muestra error y permite reintentar cuando falla la carga inicial', async () => {
    (configuracionService.getConfiguracionSeguridad as jest.Mock).mockRejectedValueOnce(
      new Error('Error de red')
    );

    render(<SeguridadTematicasAdminView />);

    expect(
      await screen.findByText(/Error al cargar Seguridad y Temáticas/i)
    ).toBeInTheDocument();

    (configuracionService.getConfiguracionSeguridad as jest.Mock).mockResolvedValueOnce(baseConfig);
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Control de Accesos y Seguridad IP/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /^Motor de Temáticas Estacionales$/i })).toBeInTheDocument();
    });
  });
});

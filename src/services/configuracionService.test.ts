import { configuracionService } from './configuracionService';
import { apiFetch } from '@/lib/apiClient';

jest.mock('@/lib/apiClient', () => ({
  apiFetch: jest.fn(),
}));

describe('configuracionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getConfiguracionSeguridad consulta /configuracion/seguridad con no-store', async () => {
    (apiFetch as jest.Mock).mockResolvedValueOnce({ ipAutorizada: '192.168.1.100' });

    const res = await configuracionService.getConfiguracionSeguridad();

    expect(apiFetch).toHaveBeenCalledWith('/configuracion/seguridad', { cache: 'no-store' });
    expect(res.ipAutorizada).toBe('192.168.1.100');
  });

  test('actualizarConfiguracionSeguridad envia PUT /configuracion/seguridad', async () => {
    const payload = {
      sucursalId: 1,
      ipAutorizada: '192.168.1.200',
      horarioInicioCajeros: '08:00',
      horarioFinCajeros: '23:00',
      autorizarExcepcionHorasExtras: true,
      confirmarCambioRed: false,
    };
    (apiFetch as jest.Mock).mockResolvedValueOnce({ ...payload, id: 1 });

    const res = await configuracionService.actualizarConfiguracionSeguridad(payload);

    expect(apiFetch).toHaveBeenCalledWith('/configuracion/seguridad', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    expect(res.ipAutorizada).toBe('192.168.1.200');
  });

  test('getTematicas, getTematicaActiva y activarTematica invocan endpoints correctos', async () => {
    (apiFetch as jest.Mock)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce({ id: 1, claveIdentificadora: 'theme-classic' })
      .mockResolvedValueOnce({ id: 2, claveIdentificadora: 'theme-halloween', esActiva: true });

    await configuracionService.getTematicas();
    await configuracionService.getTematicaActiva();
    const activated = await configuracionService.activarTematica(2);

    expect(apiFetch).toHaveBeenNthCalledWith(1, '/tematicas', { cache: 'no-store' });
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/tematicas/activa', { cache: 'no-store' });
    expect(apiFetch).toHaveBeenNthCalledWith(3, '/tematicas/2/activar', { method: 'PUT' });
    expect(activated.esActiva).toBe(true);
    expect(configuracionService.getTematicasStreamUrl()).toContain('/tematicas/stream');
  });
});

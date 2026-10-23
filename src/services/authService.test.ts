import { authService } from './authService';

global.fetch = jest.fn();

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test('checkNetwork debe retornar la respuesta de autorizacion de red', async () => {
    const mockResponse = { isAllowed: true, ipDetected: '192.168.1.105', message: 'Red Autorizada' };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await authService.checkNetwork();

    expect(result.isAllowed).toBe(true);
    expect(result.ipDetected).toBe('192.168.1.105');
  });

  test('login guarda token en localStorage cuando la respuesta es exitosa', async () => {
    const mockLoginRes = {
      success: true,
      token: 'fake-jwt-token',
      idVendedor: 1,
      nombre: 'Raul',
      rol: 'Vendedor',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockLoginRes,
    });

    const res = await authService.login({ nombreUsuario: 'Raul', password: '123' });

    expect(res.success).toBe(true);
    expect(localStorage.getItem('cine_token')).toBe('fake-jwt-token');
  });
});
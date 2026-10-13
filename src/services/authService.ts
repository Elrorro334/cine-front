import { apiFetch } from '@/lib/apiClient';
import { NetworkCheckResponseDto, LoginRequestDto, LoginResponseDto } from '@/types/api';

export const authService = {
  /**
   * Verifica la IP del usuario contra la lista blanca del cine
   */
  async checkNetwork(): Promise<NetworkCheckResponseDto> {
    return apiFetch<NetworkCheckResponseDto>('/Auth/check-network');
  },

  /**
   * Procesa el login y guarda la sesión en localStorage
   */
  async login(credentials: LoginRequestDto): Promise<LoginResponseDto> {
    const response = await apiFetch<LoginResponseDto>('/Auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (response.success && response.token) {
      // Guardar sesión localmente
      localStorage.setItem('cine_token', response.token);
      localStorage.setItem('cine_user', JSON.stringify({
        idVendedor: response.idVendedor,
        nombre: response.nombre,
        rol: response.rol,
      }));
    }

    return response;
  },

  /**
   * Cierra sesión
   */
  logout() {
    localStorage.removeItem('cine_token');
    localStorage.removeItem('cine_user');
  },

  /**
   * Obtiene la sesión actual almacenada
   */
  getUserSession() {
    if (typeof window === 'undefined') return null;
    const user = localStorage.getItem('cine_user');
    return user ? JSON.parse(user) : null;
  }
};
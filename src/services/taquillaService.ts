import { apiFetch } from '@/lib/apiClient';
import { PeliculaCarteleraDto } from '@/types/api';

export const taquillaService = {
  /**
   * Obtiene la cartelera activa del día con filtro opcional por título
   */
  async getCartelera(busqueda?: string): Promise<PeliculaCarteleraDto[]> {
    const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
    return apiFetch<PeliculaCarteleraDto[]>(`/taquilla/cartelera${query}`);
  }
};
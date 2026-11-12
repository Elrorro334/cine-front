import { apiFetch } from '@/lib/apiClient';
import {
  ActualizarConfiguracionSeguridadDto,
  ConfiguracionSeguridadDto,
  TematicaSitioDto,
} from '@/types/configuracion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5203/api';

export const THEME_BROADCAST_CHANNEL = 'xilotzin_theme_channel';
export const THEME_CUSTOM_EVENT = 'xilotzin-theme-updated';

export const configuracionService = {
  async getConfiguracionSeguridad(): Promise<ConfiguracionSeguridadDto> {
    return apiFetch<ConfiguracionSeguridadDto>('/configuracion/seguridad', {
      cache: 'no-store',
    });
  },

  async actualizarConfiguracionSeguridad(
    payload: ActualizarConfiguracionSeguridadDto
  ): Promise<ConfiguracionSeguridadDto> {
    return apiFetch<ConfiguracionSeguridadDto>('/configuracion/seguridad', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getTematicas(): Promise<TematicaSitioDto[]> {
    return apiFetch<TematicaSitioDto[]>('/tematicas', {
      cache: 'no-store',
    });
  },

  async getTematicaActiva(): Promise<TematicaSitioDto> {
    return apiFetch<TematicaSitioDto>('/tematicas/activa', {
      cache: 'no-store',
    });
  },

  async activarTematica(id: number): Promise<TematicaSitioDto> {
    return apiFetch<TematicaSitioDto>(`/tematicas/${id}/activar`, {
      method: 'PUT',
    });
  },

  getTematicasStreamUrl(): string {
    return `${API_URL}/tematicas/stream`;
  },
};

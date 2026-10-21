import { apiFetch, apiDownload } from '@/lib/apiClient';
import {
  DashboardFinancieroDto,
  SemanaCinematograficaDto,
} from '@/types/api';

export const dashboardService = {
  /**
   * Obtiene el resumen financiero con los 4 KPIs clave y las transacciones detalladas
   */
  async getResumen(params?: {
    offsetSemanas?: number;
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<DashboardFinancieroDto> {
    const query = new URLSearchParams();
    if (params?.offsetSemanas !== undefined && params?.offsetSemanas !== null) {
      query.append('offsetSemanas', params.offsetSemanas.toString());
    }
    if (params?.fechaInicio) {
      query.append('fechaInicio', params.fechaInicio);
    }
    if (params?.fechaFin) {
      query.append('fechaFin', params.fechaFin);
    }

    const qs = query.toString();
    const endpoint = `/dashboard/resumen${qs ? `?${qs}` : ''}`;
    return apiFetch<DashboardFinancieroDto>(endpoint);
  },

  /**
   * Obtiene la información de la semana cinematográfica actual (Jueves a Miércoles)
   */
  async getSemanaActual(): Promise<SemanaCinematograficaDto> {
    return apiFetch<SemanaCinematograficaDto>('/dashboard/semana-actual');
  },

  /**
   * Descarga el reporte estructurado de transacciones en formato CSV sin bloquear la UI
   */
  async exportarTransaccionesCsv(params?: {
    offsetSemanas?: number;
    fechaInicio?: string;
    fechaFin?: string;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    if (params?.offsetSemanas !== undefined && params?.offsetSemanas !== null) {
      query.append('offsetSemanas', params.offsetSemanas.toString());
    }
    if (params?.fechaInicio) {
      query.append('fechaInicio', params.fechaInicio);
    }
    if (params?.fechaFin) {
      query.append('fechaFin', params.fechaFin);
    }

    const qs = query.toString();
    const endpoint = `/dashboard/exportar-transacciones${qs ? `?${qs}` : ''}`;
    return apiDownload(endpoint);
  },
};

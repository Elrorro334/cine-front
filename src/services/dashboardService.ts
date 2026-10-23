import { apiFetch, apiDownload } from '@/lib/apiClient';
import { DashboardFinancieroDto, SemanaCinematograficaDto } from '@/types/api';

/**
 * Servicio para interacción con el módulo de Dashboard Financiero (/api/dashboard)
 * Cumple con Criterios 1, 2 y 3 de HU-10
 */
export const dashboardService = {
  /**
   * Obtiene el resumen financiero, KPIs y transacciones detalladas
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
    const endpoint = qs ? `/dashboard/resumen?${qs}` : '/dashboard/resumen';
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
    const endpoint = qs ? `/dashboard/exportar-transacciones?${qs}` : '/dashboard/exportar-transacciones';
    return apiDownload(endpoint);
  },
};

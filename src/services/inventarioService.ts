import { apiFetch } from '@/lib/apiClient';
import {
  InsumoInventarioDto,
  ActualizarPreciosDto,
  EntradaHistorialDto,
  RegistrarEntradaDto,
  ProveedorDto,
} from '@/types/inventario';

/**
 * Servicio para interacción con el módulo de Inventario Maestro (/api/inventario)
 * Cumple con Criterios 1, 2 y 3 de HU-11
 */
export const inventarioService = {
  /**
   * Obtiene el listado maestro de insumos con las 8 columnas requeridas y cálculo de margen
   */
  async getInsumos(params?: {
    categoria?: string;
    busqueda?: string;
  }): Promise<InsumoInventarioDto[]> {
    const query = new URLSearchParams();
    if (params?.categoria && params.categoria !== 'Todas') {
      query.append('categoria', params.categoria);
    }
    if (params?.busqueda) {
      query.append('busqueda', params.busqueda);
    }

    const qs = query.toString();
    const endpoint = qs ? `/inventario/insumos?${qs}` : '/inventario/insumos';
    return apiFetch<InsumoInventarioDto[]>(endpoint);
  },

  /**
   * Obtiene un insumo por ID
   */
  async getInsumoPorId(id: number): Promise<InsumoInventarioDto> {
    return apiFetch<InsumoInventarioDto>(`/inventario/insumos/${id}`);
  },

  /**
   * Criterio 3: Actualiza Costo Unitario y/o Precio de Venta, recalculando instantáneamente el margen
   */
  async actualizarPrecios(
    id: number,
    data: ActualizarPreciosDto
  ): Promise<InsumoInventarioDto> {
    return apiFetch<InsumoInventarioDto>(`/inventario/insumos/${id}/precios`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Tabla 2: Consulta el historial de facturas y entradas recibidas
   */
  async getHistorialEntradas(limite = 50): Promise<EntradaHistorialDto[]> {
    return apiFetch<EntradaHistorialDto[]>(`/inventario/entradas?limite=${limite}`);
  },

  /**
   * Criterio 2: Registra una nueva factura de mercancía incrementando el stock físico
   */
  async registrarEntrada(data: RegistrarEntradaDto): Promise<EntradaHistorialDto> {
    return apiFetch<EntradaHistorialDto>('/inventario/entradas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Catálogo de proveedores para el modal de entrada
   */
  async getProveedores(): Promise<ProveedorDto[]> {
    return apiFetch<ProveedorDto[]>('/inventario/proveedores');
  },
};

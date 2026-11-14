import { apiFetch } from '@/lib/apiClient';
import {
  InsumoInventarioDto,
  InventarioPaginadoDto,
  EstadoStockFiltro,
  OrdenInventario,
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
   * Obtiene el listado maestro completo de insumos (usado para catálogos completos y modales)
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
   * Obtiene el Inventario Maestro paginado (15 registros por página por defecto),
   * delegando búsqueda, filtros de categoría/estado de stock y ordenamiento al backend .NET.
   */
  async getInsumosPaginado(params?: {
    categoria?: string;
    busqueda?: string;
    estadoStock?: EstadoStockFiltro;
    ordenarPor?: OrdenInventario;
    pagina?: number;
    tamanoPagina?: number;
  }): Promise<InventarioPaginadoDto> {
    const query = new URLSearchParams();
    if (params?.categoria && params.categoria !== 'Todas') {
      query.append('categoria', params.categoria);
    }
    if (params?.busqueda?.trim()) {
      query.append('busqueda', params.busqueda.trim());
    }
    if (params?.estadoStock && params.estadoStock !== 'todos') {
      query.append('estadoStock', params.estadoStock);
    }
    if (params?.ordenarPor && params.ordenarPor !== 'categoria_nombre') {
      query.append('ordenarPor', params.ordenarPor);
    }
    if (params?.pagina) {
      query.append('pagina', String(params.pagina));
    }
    if (params?.tamanoPagina) {
      query.append('tamanoPagina', String(params.tamanoPagina));
    }

    const qs = query.toString();
    const endpoint = qs ? `/inventario/insumos/paginado?${qs}` : '/inventario/insumos/paginado';
    return apiFetch<InventarioPaginadoDto>(endpoint);
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

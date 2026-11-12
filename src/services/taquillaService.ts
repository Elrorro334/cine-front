import { apiFetch } from '@/lib/apiClient';
import {
  PeliculaCarteleraDto,
  FuncionButacasDto,
  ProductoDto,
  CatalogoDulceriaPosDto,
  CalcularOrdenRequestDto,
  ResumenOrdenCalculadoDto,
  RegistrarVentaDto,
  VentaConfirmadaDto,
  PreordenDto,
} from '@/types/api';

export const taquillaService = {
  /**
   * Obtiene la cartelera activa del día con filtro opcional por título
   */
  async getCartelera(busqueda?: string): Promise<PeliculaCarteleraDto[]> {
    const query = busqueda ? `?busqueda=${encodeURIComponent(busqueda)}` : '';
    return apiFetch<PeliculaCarteleraDto[]>(`/taquilla/cartelera${query}`);
  },

  /**
   * Obtiene las butacas y su estado real (ocupadas / disponibles) desde SQL Server
   */
  async getButacasFuncion(idFuncion: number): Promise<FuncionButacasDto> {
    return apiFetch<FuncionButacasDto>(`/taquilla/funciones/${idFuncion}/butacas`);
  },

  /**
   * Obtiene el catálogo de dulcería, inventario y combos dinámicos desde SQL Server
   */
  async getProductosDulceria(): Promise<ProductoDto[]> {
    return apiFetch<ProductoDto[]>('/taquilla/dulceria');
  },

  /**
   * HU-07: Obtiene el catálogo completo del POS Dulcería incluyendo el monitor de stock fraccionado de pizzas
   */
  async getCatalogoDulceriaPos(): Promise<CatalogoDulceriaPosDto> {
    return apiFetch<CatalogoDulceriaPosDto>('/taquilla/dulceria/catalogo-pos');
  },

  /**
   * HU-07: Busca un producto activo de dulcería por código de barras / SKU desde el lector óptico
   */
  async buscarProductoPorSku(sku: string): Promise<ProductoDto> {
    return apiFetch<ProductoDto>(`/taquilla/dulceria/sku/${encodeURIComponent(sku)}`);
  },

  /**
   * HU-07: Calcula en el servidor el resumen de venta y el monitor de stock fraccionado proyectado
   */
  async calcularOrdenPos(dto: CalcularOrdenRequestDto): Promise<ResumenOrdenCalculadoDto> {
    return apiFetch<ResumenOrdenCalculadoDto>('/taquilla/dulceria/calcular-orden', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Registra la venta oficial en SQL Server, descuenta stock y reserva butacas
   */
  async registrarVenta(dto: RegistrarVentaDto): Promise<VentaConfirmadaDto> {
    return apiFetch<VentaConfirmadaDto>('/taquilla/venta', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Valida un código QR de pre-orden en SQL Server y retorna sus boletos y productos
   */
  async getPreorden(codigoQr: string): Promise<PreordenDto> {
    return apiFetch<PreordenDto>(`/taquilla/preorden/${encodeURIComponent(codigoQr)}`);
  },

  /**
   * HU-08: Obtiene el listado de pre-órdenes activas y vigentes (<= 12 días) para selector rápido en caja
   */
  async getPreordenesActivas(): Promise<PreordenDto[]> {
    return apiFetch<PreordenDto[]>('/taquilla/preordenes-activas');
  },

  /**
   * HU-08: Valida un código QR de pre-orden en caja verificando vigencia de 12 días y que no esté canjeada
   */
  async validarPreordenQr(codigoQr: string): Promise<PreordenDto> {
    return apiFetch<PreordenDto>(`/taquilla/preorden/validar/${encodeURIComponent(codigoQr)}`, {
      method: 'POST',
    });
  },
};

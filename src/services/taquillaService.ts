import { apiFetch } from '@/lib/apiClient';
import {
  PeliculaCarteleraDto,
  FuncionButacasDto,
  ProductoDto,
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
};
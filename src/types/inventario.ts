/**
 * DTOs para la HU-11: Gestión de Inventario Maestro y Registro de Entradas
 */

export type CategoriaInsumo = 'Snacks' | 'Bebidas' | 'Dulces' | 'Comida' | 'Pizzas' | (string & {});

export type EstadoStockFiltro = 'todos' | 'alerta' | 'agotado' | 'optimo';

export type OrdenInventario =
  | 'categoria_nombre'
  | 'producto_asc'
  | 'producto_desc'
  | 'sku_asc'
  | 'stock_asc'
  | 'stock_desc'
  | 'margen_asc'
  | 'margen_desc'
  | 'precio_asc'
  | 'precio_desc';

export interface InsumoInventarioDto {
  idProducto: number;
  sku: string;
  producto: string;
  categoria: CategoriaInsumo;
  stockActual: number;
  minimoAlerta: number;
  costoUnitario: number;
  precioVenta: number;
  margenPorcentaje: number;
  enAlerta: boolean;
  factorEquivalencia: number;
  icono: string;
}

export interface InventarioPaginadoDto {
  items: InsumoInventarioDto[];
  paginaActual: number;
  tamanoPagina: number;
  totalRegistros: number;
  totalPaginas: number;
  totalEnAlerta: number;
  totalAgotados: number;
  categoriasDisponibles: string[];
}

export interface EntradaHistorialLineaDto {
  idEntrada: number;
  idProducto: number;
  producto: string;
  sku: string;
  cantidadComprada: number;
  factorEquivalencia: number;
  cantidadStockAgregada: number;
  costoUnitario: number;
  costoTotal: number;
}

export interface EntradaHistorialDto {
  idFactura: number;
  proveedor: string;
  factura: string;
  totalPagado: number;
  fechaRegistro: string;
  registradoPor?: string;
  lineas: EntradaHistorialLineaDto[];
}

export interface RegistrarEntradaLineaDto {
  idProducto: number;
  cantidad: number;
  costoUnitario: number;
}

export interface RegistrarEntradaDto {
  idProveedor: number;
  folioFactura: string;
  totalPagado: number;
  lineas: RegistrarEntradaLineaDto[];
}

export interface ActualizarPreciosDto {
  costoUnitario: number;
  precioVenta: number;
}

export interface ProveedorDto {
  idProveedor: number;
  nombre: string;
  rfc?: string;
  telefono?: string;
  contacto?: string;
}

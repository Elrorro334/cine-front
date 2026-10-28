// DTOs de Autenticación (HU-04)
export interface NetworkCheckResponseDto {
  isAllowed: boolean;
  ipDetected: string;
  message: string;
}

export interface LoginRequestDto {
  nombreUsuario: string;
  password: string;
}

export interface LoginResponseDto {
  success: boolean;
  message: string;
  idVendedor?: number;
  nombre?: string;
  rol?: string;
  token?: string;
}

// DTOs de Cartelera POS (HU-05) y Pública
export interface FuncionHorarioDto {
  idFuncion: number;
  hora: string;
  nombreSala: string;
  precio?: number;
}

export interface PeliculaCarteleraDto {
  idPelicula: number;
  titulo: string;
  sinopsis?: string;
  duracion?: number;
  clasificacion?: string;
  director?: string;
  poster_image?: string;
  poster_path?: string;
  funciones: FuncionHorarioDto[];
}

export interface TmdbSearchResultDto {
  tmdbId: number;
  titulo: string;
  tituloOriginal?: string;
  sinopsis: string;
  posterPath?: string; // Ruta relativa estricta ej: "/xyz.jpg"
  posterUrl?: string;
  releaseYear: string;
  rating: number;
}

export interface TmdbMovieDetailDto {
  tmdbId: number;
  titulo: string;
  tituloOriginal?: string;
  sinopsis: string;
  duracion: number;
  clasificacion: string;
  director: string;
  actores: string;
  genero: string;
  posterPath: string; // Ruta relativa estricta
  posterUrl?: string;
  releaseYear: string;
  rating: number;
  trailerKey?: string | null;
}

export interface RegistrarPeliculaDto {
  titulo: string;
  sinopsis?: string;
  duracion?: number;
  clasificacion?: string;
  director?: string;
  posterImage?: string;
  posterPath?: string;
  idSala?: number;
  horario?: string;
  horarios?: string[];
  fechaInicio?: string;
  fechaFin?: string;
  precio?: number;
}

export interface PromocionDto {
  id: number;
  titulo: string;
  tag: string;
  descripcion: string;
  fecha: string;
  bg: string;
  icono: string;
}

export interface ButacaDto {
  idButaca: number;
  fila: string;
  numero: number;
  codigo: string;
  estaOcupada: boolean;
}

export interface FuncionButacasDto {
  idFuncion: number;
  idSala: number;
  nombreSala: string;
  precio: number;
  butacas: ButacaDto[];
}

export interface ProductoDto {
  idProducto: number;
  sku: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  img?: string;
}

export interface RegistrarVentaItemDto {
  idProducto?: number;
  idFuncion?: number;
  sku: string;
  nombre: string;
  tipo: string;
  cantidad: number;
  precio: number;
  asientos?: string[];
}

export interface RegistrarVentaDto {
  idVendedor: number;
  metodoPago: string;
  items: RegistrarVentaItemDto[];
}

export interface VentaConfirmadaDto {
  idVenta: number;
  folio: string;
  total: number;
  metodoPago: string;
  fechaVenta: string;
  items: RegistrarVentaItemDto[];
}

export interface PreordenComboDto {
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface PreordenDto {
  idPreorden: number;
  codigo: string;
  cliente: string;
  telefono: string;
  pelicula: string;
  horario: string;
  idFuncion: number;
  boletosGeneral: number;
  precioBoleto: number;
  asientos: string[];
  combos: PreordenComboDto[];
  total: number;
  fechaCreacion: string;
  vigenciaDias: number;
  estadoActivo: boolean;
}

// DTOs de Dashboard Financiero (HU-10)
export interface CrearPreordenItemDulceriaDto {
  idProducto: number;
  cantidad: number;
}

export interface CrearPreordenDto {
  idFuncion: number;
  boletos: number;
  nombreCliente: string;
  telefonoCliente: string;
  combos?: CrearPreordenItemDulceriaDto[];
}

export interface PeriodoDashboardDto {
  fechaInicio: string;
  fechaFin: string;
  descripcionSemana: string;
}

export interface MetodoPagoDesgloseDto {
  metodo: string;
  total: number;
  porcentaje: number;
  cantidadTransacciones: number;
}

export interface KpiFinancieroDto {
  totalIngresos: number;
  totalTaquilla: number;
  boletosVendidos: number;
  totalDulceria: number;
  productosDulceriaVendidos: number;
  efectivo: MetodoPagoDesgloseDto;
  tarjeta: MetodoPagoDesgloseDto;
  otros: MetodoPagoDesgloseDto;
  totalTransacciones: number;
  ticketPromedio: number;
}

export interface TransaccionDetalleDto {
  idVenta: number;
  fechaHora: string;
  cajero: string;
  tipoTransaccion: string;
  metodoPago: string;
  total: number;
  cantidadArticulos: number;
  resumenDetalle: string;
}

export interface DashboardFinancieroDto {
  periodo: PeriodoDashboardDto;
  kpis: KpiFinancieroDto;
  transacciones: TransaccionDetalleDto[];
}

export interface SemanaCinematograficaDto {
  fechaInicio: string;
  fechaFin: string;
  descripcion: string;
}

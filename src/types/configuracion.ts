export interface TurnoLaboralDto {
  id: number;
  nombreTurno: string;
  horaInicio: string;
  horaFin: string;
}

export interface ConfiguracionSeguridadDto {
  id: number;
  sucursalId: number;
  sucursalNombre: string;
  ipDefecto: string;
  ipAutorizada: string;
  horarioInicioCajeros: string;
  horarioFinCajeros: string;
  autorizarExcepcionHorasExtras: boolean;
  fechaUltimaModificacion: string;
  usuarioModificoId: number;
  ipClienteDetectada: string;
  mismaSubredQueCliente: boolean;
  turnosLaborales: TurnoLaboralDto[];
}

export interface ActualizarConfiguracionSeguridadDto {
  sucursalId?: number;
  ipAutorizada: string;
  horarioInicioCajeros: string;
  horarioFinCajeros: string;
  autorizarExcepcionHorasExtras: boolean;
  confirmarCambioRed: boolean;
}

export interface FailSafeSubredErrorData {
  requiereConfirmacion?: boolean;
  ipClienteDetectada?: string;
  ipSolicitada?: string;
  message?: string;
}

export interface PaletaColoresTheme {
  primary?: string;
  secondary?: string;
  background?: string;
  surface?: string;
  text?: string;
  icon?: string;
}

export interface TematicaSitioDto {
  id: number;
  nombreTematica: string;
  claveIdentificadora: string;
  esActiva: boolean;
  fechaActivacion?: string | null;
  rutaArchivoCss: string;
  paletaColoresJson: string;
  tipografia: string;
  icono: string;
}

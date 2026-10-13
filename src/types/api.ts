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

// DTOs de Cartelera POS (HU-05)
export interface FuncionHorarioDto {
  idFuncion: number;
  hora: string;
  nombreSala: string;
}

export interface PeliculaCarteleraDto {
  idPelicula: number;
  titulo: string;
  clasificacion?: string;
  director?: string;
  poster_image?: string;
  funciones: FuncionHorarioDto[];
}
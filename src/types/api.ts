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
  posterPath: string; // Ruta relativa estricta ej: "/xyz.jpg"
  backdropPath?: string;
  releaseYear: string;
  rating: number;
  trailerKey?: string | null;
}

export interface RegistrarPeliculaDto {
  titulo: string;
  sinopsis: string;
  duracion?: number;
  clasificacion?: string;
  director?: string;
  posterPath?: string; // Ruta relativa estricta ej: "/xyz.jpg"
  posterImage?: string;
  precio?: number;
  horario?: string;
  idSala?: number;
}
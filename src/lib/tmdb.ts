/**
 * Utilidades para TMDB y resolución de URLs de imágenes
 * Regla de negocio: La BD relacional SOLO almacena rutas relativas (ej. '/xyz.jpg').
 * La capa cliente es la única responsable de concatenar el CDN base.
 */

export const TMDB_CDN_BASE = 'https://image.tmdb.org/t/p/w500';
export const TMDB_ORIGINAL_BASE = 'https://image.tmdb.org/t/p/original';

/**
 * Concatena el CDN de TMDB si la ruta es relativa, o devuelve la URL segura
 */
export function getPosterUrl(path?: string | null): string {
  if (!path || path.trim() === '') {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=600';
  }

  const trimmed = path.trim();

  // Si ya es una URL absoluta segura
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Asegurar que comience con '/'
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${TMDB_CDN_BASE}${cleanPath}`;
}

export function getBackdropUrl(path?: string | null): string {
  if (!path || path.trim() === '') {
    return '';
  }

  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${TMDB_ORIGINAL_BASE}${cleanPath}`;
}

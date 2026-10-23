const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5203/api';

/**
 * Clase de error estructurada para peticiones a la API
 */
export class ApiError extends Error {
  status: number;
  data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Petición HTTP genérica con inyección de JWT
 */
export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // 1. Obtener el token guardado en localStorage (si existe)
  const token = typeof window !== 'undefined' ? localStorage.getItem('cine_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // 2. Si hay token, adjuntarlo en la cabecera
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 3. Petición al backend
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 4. Si la respuesta trae contenido JSON, parsearlo
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data.message || `Error HTTP: ${response.status}`, data);
  }

  return data as T;
}

/**
 * Descarga de archivos binarios (ej. CSV, Excel, Reportes) con inyección de JWT
 */
export async function apiDownload(endpoint: string, options: RequestInit = {}): Promise<Blob> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cine_token') : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Error al descargar archivo: ${response.status}`);
  }

  return response.blob();
}

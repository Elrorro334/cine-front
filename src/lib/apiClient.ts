const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5203/api';

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
    // Retornamos el objeto de error retornado por la API si existe
    throw {
      status: response.status,
      message: data.message || `Error HTTP: ${response.status}`,
      data,
    };
  }

  return data as T;
}
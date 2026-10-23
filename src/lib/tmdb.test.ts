import { getPosterUrl, getBackdropUrl, TMDB_CDN_BASE, TMDB_ORIGINAL_BASE } from './tmdb';

describe('tmdb utilities', () => {
  test('getPosterUrl retorna imagen por defecto cuando path es vacío o nulo', () => {
    expect(getPosterUrl(null)).toContain('images.unsplash.com');
    expect(getPosterUrl('')).toContain('images.unsplash.com');
  });

  test('getPosterUrl mantiene URLs absolutas y concatena rutas relativas', () => {
    expect(getPosterUrl('https://example.com/poster.jpg')).toBe('https://example.com/poster.jpg');
    expect(getPosterUrl('/abc.jpg')).toBe(`${TMDB_CDN_BASE}/abc.jpg`);
    expect(getPosterUrl('abc.jpg')).toBe(`${TMDB_CDN_BASE}/abc.jpg`);
  });

  test('getBackdropUrl retorna string vacío si no hay ruta o concatena original base', () => {
    expect(getBackdropUrl(null)).toBe('');
    expect(getBackdropUrl('https://example.com/bg.jpg')).toBe('https://example.com/bg.jpg');
    expect(getBackdropUrl('/bg.jpg')).toBe(`${TMDB_ORIGINAL_BASE}/bg.jpg`);
    expect(getBackdropUrl('bg.jpg')).toBe(`${TMDB_ORIGINAL_BASE}/bg.jpg`);
  });
});

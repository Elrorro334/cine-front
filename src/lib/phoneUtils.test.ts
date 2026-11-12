import { normalizeMexicanPhone, formatTicketValidityDate } from './phoneUtils';

describe('phoneUtils', () => {
  test('normalizeMexicanPhone acepta números de distintas ladas de México y +52', () => {
    expect(normalizeMexicanPhone('7731234567')).toEqual({
      phone: '7731234567',
      error: null,
    });
    expect(normalizeMexicanPhone('+52 773 123 4567')).toEqual({
      phone: '7731234567',
      error: null,
    });
    expect(normalizeMexicanPhone('+52 (55) 1234-5678')).toEqual({
      phone: '5512345678',
      error: null,
    });
    expect(normalizeMexicanPhone('5213312345678')).toEqual({
      phone: '3312345678',
      error: null,
    });
  });

  test('normalizeMexicanPhone valida vacío, inicio en 0/1 y longitud incompleta', () => {
    expect(normalizeMexicanPhone('')).toEqual({
      phone: '',
      error: 'El teléfono es obligatorio.',
    });
    expect(normalizeMexicanPhone('0123456789').error).toMatch(/no puede iniciar con 0 o 1/i);
    expect(normalizeMexicanPhone('1551234567').error).toMatch(/no puede iniciar con 0 o 1/i);
    expect(normalizeMexicanPhone('77312').error).toBe('Faltan dígitos: llevas 5 de 10 dígitos.');
  });

  test('formatTicketValidityDate suma días de vigencia sobre fechaCreacion en zona local sin desfase', () => {
    const formatted = formatTicketValidityDate('2026-10-10', 12);
    expect(formatted).toContain('22');
    expect(formatted).toContain('2026');

    const fallback = formatTicketValidityDate(undefined, 0);
    expect(fallback.length).toBeGreaterThan(4);
  });
});

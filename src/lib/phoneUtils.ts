export interface MexicanPhoneValidation {
  phone: string;
  error: string | null;
}

/**
 * Normaliza y valida teléfonos mexicanos de 10 dígitos nacionales.
 * Acepta entradas con prefijo internacional +52, +52 1, espacios, paréntesis o guiones.
 */
export function normalizeMexicanPhone(rawInput: string): MexicanPhoneValidation {
  let cleaned = rawInput.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+52')) {
    cleaned = cleaned.slice(3);
  }

  const digitsOnly = cleaned.replace(/\D/g, '');
  let normalized = digitsOnly;

  if (normalized.startsWith('521') && normalized.length === 13) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith('52') && normalized.length === 12) {
    normalized = normalized.slice(2);
  }

  const finalPhone = normalized.slice(0, 10);

  if (finalPhone.length === 0) {
    return { phone: finalPhone, error: 'El teléfono es obligatorio.' };
  }

  if (finalPhone.startsWith('0') || finalPhone.startsWith('1')) {
    return {
      phone: finalPhone,
      error: 'Ingresa un número válido de México (la lada no puede iniciar con 0 o 1).',
    };
  }

  if (finalPhone.length < 10) {
    return {
      phone: finalPhone,
      error: `Faltan dígitos: llevas ${finalPhone.length} de 10 dígitos.`,
    };
  }

  return { phone: finalPhone, error: null };
}

/**
 * Calcula la fecha límite de vigencia de una pre-orden usando fecha calendario local
 * para evitar desfases de zona horaria UTC.
 */
export function formatTicketValidityDate(fechaCreacion?: string, vigenciaDias = 12): string {
  const dias = vigenciaDias > 0 ? vigenciaDias : 12;
  let baseDate = new Date();

  if (fechaCreacion) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaCreacion.trim());
    if (match) {
      const year = Number(match[1]);
      const monthIndex = Number(match[2]) - 1;
      const day = Number(match[3]);
      baseDate = new Date(year, monthIndex, day);
    }
  }

  const expirationDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + dias
  );

  return expirationDate.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

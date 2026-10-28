import QRCode from 'qrcode';

/**
 * Genera un código QR nativo de alta resolución en formato DataURL (Base64 PNG)
 * sin depender de servicios ni APIs externas de terceros.
 */
export async function generarQrDataUrl(texto: string): Promise<string> {
  if (!texto || !texto.trim()) {
    return '';
  }

  try {
    return await QRCode.toDataURL(texto.trim(), {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });
  } catch {
    return '';
  }
}

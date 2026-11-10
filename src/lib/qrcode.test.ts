import { generarQrDataUrl } from './qrcode';

describe('qrcode generator', () => {
  it('debe retornar string vacío si el texto es vacío', async () => {
    const res = await generarQrDataUrl('');
    expect(res).toBe('');
  });

  it('debe generar un data URL válido con prefijo data:image/png', async () => {
    const res = await generarQrDataUrl('PRE-XIL-12345');
    expect(res).toContain('data:image/png;base64');
  });
});

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MisTicketsSection from './MisTicketsSection';
import { carteleraService } from '@/services/carteleraService';
import { PreordenDto } from '@/types/api';

jest.mock('@/services/carteleraService');
jest.mock('@/lib/qrcode', () => ({
  generarQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mockminiqr'),
}));

const sampleTickets: PreordenDto[] = [
  {
    idPreorden: 1,
    codigo: 'PRE-XIL-80001',
    cliente: 'Alberto Cruz',
    telefono: '7731234567',
    pelicula: 'Five Nights at Freddys 2',
    horario: '17:45',
    idFuncion: 10,
    boletosGeneral: 2,
    precioBoleto: 50,
    asientos: [],
    combos: [{ nombre: 'Combo Pareja', cantidad: 1, precio: 110 }],
    total: 210,
    fechaCreacion: '2026-11-10',
    vigenciaDias: 12,
    estadoActivo: true,
  },
  {
    idPreorden: 2,
    codigo: 'PRE-XIL-80002',
    cliente: 'Alberto Cruz',
    telefono: '7731234567',
    pelicula: 'Spider-Man',
    horario: '20:00',
    idFuncion: 11,
    boletosGeneral: 1,
    precioBoleto: 50,
    asientos: [],
    combos: [],
    total: 50,
    fechaCreacion: '2026-11-01',
    vigenciaDias: 12,
    estadoActivo: false,
  },
];

describe('MisTicketsSection Component (HU-03 Offline + SMS)', () => {
  const onOpenQr = jest.fn();
  const onGoToNewPreorder = jest.fn();
  const onTicketsRecovered = jest.fn();
  const onChangeVerifiedPhone = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  test('muestra tickets cuando el teléfono está verificado por SMS y permite cambiar número', async () => {
    render(
      <MisTicketsSection
        tickets={sampleTickets}
        verifiedPhone="7731234567"
        onOpenQr={onOpenQr}
        onGoToNewPreorder={onGoToNewPreorder}
        onTicketsRecovered={onTicketsRecovered}
        onChangeVerifiedPhone={onChangeVerifiedPhone}
      />
    );

    expect(await screen.findByAltText('Miniatura QR PRE-XIL-80001')).toBeInTheDocument();
    expect(screen.getByText('PRE-XIL-80001')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Canjeado')).toBeInTheDocument();
    expect(screen.getByText('Five Nights at Freddys 2')).toBeInTheDocument();
    expect(screen.getByText('$210 MXN')).toBeInTheDocument();
    expect(screen.getByText(/1 Combo\(s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1 Boleto/i)).toBeInTheDocument();
    expect(screen.getByText(/Verificado: \+52 \*\*\*\*\*\*4567/i)).toBeInTheDocument();
    expect(screen.queryByText(/En línea • Caché offline activa/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Limpiar dispositivo/i })).not.toBeInTheDocument();

    const qrButtons = screen.getAllByRole('button', { name: /Ver QR/i });
    fireEvent.click(qrButtons[0]);
    expect(onOpenQr).toHaveBeenCalledWith(sampleTickets[0]);

    fireEvent.click(screen.getByRole('button', { name: /Consultar otro número/i }));
    expect(onChangeVerifiedPhone).toHaveBeenCalled();
  });

  test('en línea sin verificar SMS oculta caché previa y solicita teléfono', async () => {
    render(
      <MisTicketsSection
        tickets={sampleTickets}
        verifiedPhone={null}
        onOpenQr={onOpenQr}
        onGoToNewPreorder={onGoToNewPreorder}
        onTicketsRecovered={onTicketsRecovered}
        onChangeVerifiedPhone={onChangeVerifiedPhone}
      />
    );

    expect(await screen.findByText(/Recupera tus Tickets por Teléfono \(SMS\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono registrado/i)).toBeInTheDocument();
    expect(screen.queryByText('PRE-XIL-80001')).not.toBeInTheDocument();
    expect(screen.getByText(/Por privacidad, verifica tu número por SMS arriba/i)).toBeInTheDocument();
  });

  test('funciona en modo sin conexión (offline) cargando caché local sin bloquear QR', async () => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: false,
    });

    render(
      <MisTicketsSection
        tickets={[sampleTickets[0]]}
        verifiedPhone={null}
        onOpenQr={onOpenQr}
        onGoToNewPreorder={onGoToNewPreorder}
        onTicketsRecovered={onTicketsRecovered}
        onChangeVerifiedPhone={onChangeVerifiedPhone}
      />
    );

    expect(await screen.findByText(/Modo sin conexión • Leyendo tickets guardados/i)).toBeInTheDocument();
    expect(screen.getByText('PRE-XIL-80001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Ver QR/i }));
    expect(onOpenQr).toHaveBeenCalledWith(sampleTickets[0]);

    // Transición dinámica a online: solicita verificación SMS antes de mostrar caché
    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(await screen.findByLabelText(/Teléfono registrado/i)).toBeInTheDocument();
    expect(screen.queryByText('PRE-XIL-80001')).not.toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(await screen.findByText(/Modo sin conexión/i)).toBeInTheDocument();
    expect(screen.getByText('PRE-XIL-80001')).toBeInTheDocument();
  });

  test('recupera tickets por SMS en 2 pasos con Twilio', async () => {
    (carteleraService.solicitarCodigoPreordenes as jest.Mock).mockResolvedValue({
      enviado: true,
      telefonoEnmascarado: '******4567',
      expiraEnMinutos: 10,
      message: 'Enviado',
    });
    (carteleraService.verificarCodigoPreordenes as jest.Mock).mockResolvedValueOnce([sampleTickets[0]]);

    render(
      <MisTicketsSection
        tickets={[]}
        verifiedPhone={null}
        onOpenQr={onOpenQr}
        onGoToNewPreorder={onGoToNewPreorder}
        onTicketsRecovered={onTicketsRecovered}
        onChangeVerifiedPhone={onChangeVerifiedPhone}
      />
    );

    expect(await screen.findByText(/Recupera tus Tickets por Teléfono \(SMS\)/i)).toBeInTheDocument();

    const phoneInput = screen.getByLabelText(/Teléfono registrado/i);
    fireEvent.change(phoneInput, { target: { value: '773' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar código SMS/i }));
    expect(carteleraService.solicitarCodigoPreordenes).not.toHaveBeenCalled();

    fireEvent.change(phoneInput, { target: { value: '+52 773 123 4567' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar código SMS/i }));

    expect(await screen.findByText(/\+52 \*\*\*\*\*\*4567/i)).toBeInTheDocument();
    expect(carteleraService.solicitarCodigoPreordenes).toHaveBeenCalledWith('7731234567');

    // Probar reenviar código
    fireEvent.click(screen.getByRole('button', { name: /Reenviar código SMS/i }));
    await waitFor(() => {
      expect(carteleraService.solicitarCodigoPreordenes).toHaveBeenCalledTimes(2);
    });

    const otpInput = screen.getByLabelText(/Código de verificación \(6 dígitos\)/i);
    fireEvent.change(otpInput, { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: /Verificar y Ver Tickets/i }));
    expect(await screen.findByText(/código completo de 6 dígitos/i)).toBeInTheDocument();

    fireEvent.change(otpInput, { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /Verificar y Ver Tickets/i }));

    await waitFor(() => {
      expect(carteleraService.verificarCodigoPreordenes).toHaveBeenCalledWith('7731234567', '654321');
      expect(onTicketsRecovered).toHaveBeenCalledWith('7731234567', [sampleTickets[0]]);
    });
    expect(await screen.findByText(/Se sincronizaron 1 ticket\(s\)/i)).toBeInTheDocument();
  });

  test('maneja errores de API en envío/verificación y estado vacío verificado', async () => {
    (carteleraService.solicitarCodigoPreordenes as jest.Mock).mockRejectedValueOnce({
      message: 'Error HTTP: 404',
      data: { error: 'No encontramos pre-órdenes registradas con este número de teléfono.' },
    });

    const { rerender } = render(
      <MisTicketsSection
        tickets={[sampleTickets[0]]}
        verifiedPhone={null}
        onOpenQr={onOpenQr}
        onGoToNewPreorder={onGoToNewPreorder}
        onTicketsRecovered={onTicketsRecovered}
        onChangeVerifiedPhone={onChangeVerifiedPhone}
      />
    );

    fireEvent.change(await screen.findByLabelText(/Teléfono registrado/i), {
      target: { value: '5512345678' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar código SMS/i }));

    expect(
      await screen.findByText(/No encontramos pre-órdenes registradas con este número de teléfono/i)
    ).toBeInTheDocument();

    rerender(
      <MisTicketsSection
        tickets={[]}
        verifiedPhone="5512345678"
        onOpenQr={onOpenQr}
        onGoToNewPreorder={onGoToNewPreorder}
        onTicketsRecovered={onTicketsRecovered}
        onChangeVerifiedPhone={onChangeVerifiedPhone}
      />
    );
    expect(await screen.findByText('Aún no tienes tickets guardados')).toBeInTheDocument();
  });

  test('permite cambiar número en paso de código y muestra error al verificar código inválido', async () => {
    (carteleraService.solicitarCodigoPreordenes as jest.Mock).mockResolvedValueOnce({
      enviado: true,
      telefonoEnmascarado: '******5678',
      expiraEnMinutos: 10,
      message: 'Enviado',
    });
    (carteleraService.verificarCodigoPreordenes as jest.Mock).mockRejectedValueOnce(
      new Error('El código ingresado es incorrecto.')
    );

    render(
      <MisTicketsSection
        tickets={[]}
        verifiedPhone={null}
        onOpenQr={onOpenQr}
        onGoToNewPreorder={onGoToNewPreorder}
        onTicketsRecovered={onTicketsRecovered}
        onChangeVerifiedPhone={onChangeVerifiedPhone}
      />
    );

    fireEvent.change(await screen.findByLabelText(/Teléfono registrado/i), { target: { value: '5512345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar código SMS/i }));

    fireEvent.change(await screen.findByLabelText(/Código de verificación/i), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: /Verificar y Ver Tickets/i }));
    expect(await screen.findByText(/El código ingresado es incorrecto/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cambiar número de teléfono/i }));
    expect(screen.getByLabelText(/Teléfono registrado/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Generar Pre-orden/i }));
    expect(onGoToNewPreorder).toHaveBeenCalled();
  });
});

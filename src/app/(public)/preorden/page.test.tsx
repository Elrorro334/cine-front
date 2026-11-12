import { render, screen, fireEvent } from '@testing-library/react';
import PreordenPage from './page';
import { carteleraService } from '@/services/carteleraService';
import { apiFetch } from '@/lib/apiClient';
import { Movie } from '@/types/cartelera';
import { ProductoDto, PreordenDto } from '@/types/api';

const mockGet = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

jest.mock('@/services/carteleraService');
jest.mock('@/lib/apiClient');
jest.mock('@/lib/qrcode', () => ({
  generarQrDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mockqr'),
}));

const mockMovies: Movie[] = [
  {
    id: 1,
    title: 'La posesión de la momia',
    tagline: '¿Qué le pasó a Katie?',
    classification: 'B',
    duration: '133 min',
    genre: 'Terror',
    allGenres: 'Terror',
    rating: '7.8',
    posterUrl: 'https://images.unsplash.com/photo-1.jpg',
    backdropUrl: 'https://images.unsplash.com/photo-1.jpg',
    synopsis: 'La joven hija de un periodista desaparece...',
    releaseYear: '2026',
    director: 'Lee Cronin',
    actors: 'Jack Reynor',
    trailerKey: null,
    showtimes: ['14:30', '19:00'],
    funciones: [
      { idFuncion: 101, hora: '14:30', nombreSala: 'Sala 1', precio: 50 },
      { idFuncion: 102, hora: '19:00', nombreSala: 'Sala 1', precio: 50 },
    ],
  },
  {
    id: 2,
    title: 'Super Mario Bros',
    tagline: 'Aventura',
    classification: 'AA',
    duration: '95 min',
    genre: 'Animación',
    allGenres: 'Animación',
    rating: '8.5',
    posterUrl: 'https://images.unsplash.com/photo-2.jpg',
    backdropUrl: 'https://images.unsplash.com/photo-2.jpg',
    synopsis: 'Fontaneros en el reino champiñón...',
    releaseYear: '2026',
    director: 'Aaron Horvath',
    actors: 'Chris Pratt',
    trailerKey: null,
    showtimes: ['13:00'],
    funciones: [
      { idFuncion: 201, hora: '13:00', nombreSala: 'Sala 2', precio: 60 },
    ],
  },
];

const mockDulceria: ProductoDto[] = [
  {
    idProducto: 10,
    sku: 'COMBO01',
    nombre: 'Combo Pareja Xilotzin',
    categoria: 'Combos',
    precio: 110,
    stock: 50,
  },
];

describe('PreordenPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGet.mockReturnValue(null);

    (carteleraService.getCarteleraHoy as jest.Mock).mockResolvedValue(mockMovies);
    (apiFetch as jest.Mock).mockResolvedValue(mockDulceria);
  });

  test('renderiza el formulario con catálogo y resumen inicial', async () => {
    render(<PreordenPage />);

    expect(await screen.findByText('Ticket Digital con Código QR')).toBeInTheDocument();
    expect(screen.getByText('Selecciona tu Película')).toBeInTheDocument();
    expect(screen.getByText('Horario de Función')).toBeInTheDocument();
    expect(screen.getByText('Cantidad de Boletos')).toBeInTheDocument();
    expect(screen.getByText('Agrega Dulcería a tu Pre-orden')).toBeInTheDocument();
    expect(screen.getByText('Datos de Quien Recoge')).toBeInTheDocument();
    expect(screen.getByText('Resumen en Taquilla')).toBeInTheDocument();

    // Película 1 preseleccionada
    const titles = await screen.findAllByText('La posesión de la momia');
    expect(titles.length).toBeGreaterThan(0);
    const horarios = screen.getAllByText('14:30');
    expect(horarios.length).toBeGreaterThan(0);
  });

  test('permite cambiar boletos con [+] y [-] y actualiza el total en tiempo real', async () => {
    render(<PreordenPage />);

    await screen.findAllByText('La posesión de la momia');

    const masBtn = screen.getByRole('button', { name: /Sumar un boleto/i });
    fireEvent.click(masBtn);

    // Boletos pasa de 1 a 2: 2 * 50 = $100 MXN
    expect(screen.getAllByText('$100 MXN').length).toBeGreaterThanOrEqual(1);

    const menosBtn = screen.getByRole('button', { name: /Restar un boleto/i });
    fireEvent.click(menosBtn);
    // Vuelve a 1: 1 * 50 = $50 MXN
    expect(screen.getAllByText('$50 MXN').length).toBeGreaterThanOrEqual(1);
  });

  test('permite agregar combos y actualizar el subtotal', async () => {
    render(<PreordenPage />);

    await screen.findAllByText('La posesión de la momia');
    expect(await screen.findByText('Combo Pareja Xilotzin')).toBeInTheDocument();

    const agregarComboBtn = screen.getByRole('button', { name: /Agregar Combo Pareja Xilotzin/i });
    fireEvent.click(agregarComboBtn);

    // 1 boleto ($50) + 1 combo ($110) = $160 MXN
    expect(screen.getByText('$160 MXN')).toBeInTheDocument();
  });

  test('valida formato de teléfono de México (10 dígitos con cualquier lada y soporte +52)', async () => {
    render(<PreordenPage />);

    await screen.findAllByText('La posesión de la momia');

    const telInput = screen.getByLabelText(/Teléfono \/ WhatsApp/i);

    // Número que inicia con 0 o 1 (inválido en México)
    fireEvent.change(telInput, { target: { value: '0123456789' } });
    expect(screen.getByText(/la lada no puede iniciar con 0 o 1/i)).toBeInTheDocument();

    // Número incompleto
    fireEvent.change(telInput, { target: { value: '77312' } });
    expect(screen.getByText(/Faltan dígitos: llevas 5 de 10 dígitos/i)).toBeInTheDocument();

    // Número válido de Tula de Allende (Lada 773)
    fireEvent.change(telInput, { target: { value: '7731234567' } });
    expect(screen.queryByText(/la lada no puede iniciar con 0 o 1/i)).toBeNull();
    expect(screen.queryByText(/Faltan dígitos/i)).toBeNull();

    // Número con formato internacional +52 pegado
    fireEvent.change(telInput, { target: { value: '+52 773 123 4567' } });
    expect((telInput as HTMLInputElement).value).toBe('7731234567');
    expect(screen.queryByText(/Faltan dígitos/i)).toBeNull();
  });

  test('envía preorden y abre el modal con código QR e información completa', async () => {
    const mockTicketResult: PreordenDto = {
      idPreorden: 99,
      codigo: 'PRE-XIL-35677',
      cliente: 'Alberto Cruz',
      telefono: '5512345678',
      pelicula: 'La posesión de la momia',
      horario: '14:30',
      idFuncion: 101,
      boletosGeneral: 2,
      precioBoleto: 50,
      asientos: [],
      combos: [],
      total: 100,
      fechaCreacion: '2026-10-27',
      vigenciaDias: 12,
      estadoActivo: true,
    };

    (carteleraService.crearPreorden as jest.Mock).mockResolvedValueOnce(mockTicketResult);

    render(<PreordenPage />);

    await screen.findAllByText('La posesión de la momia');

    const nombreInput = screen.getByLabelText(/Nombre Completo \*/i);
    const telInput = screen.getByLabelText(/Teléfono \/ WhatsApp/i);

    fireEvent.change(nombreInput, { target: { value: 'Alberto Cruz' } });
    fireEvent.change(telInput, { target: { value: '5512345678' } });

    const submitBtn = screen.getByRole('button', { name: /Generar Mi Ticket Digital QR/i });
    fireEvent.click(submitBtn);

    // Modal se abre con el ticket generado
    expect(await screen.findByText('PRE-XIL-35677')).toBeInTheDocument();
    expect(screen.getByText(/VIGENTE \(12 DÍAS\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Imprimir \/ PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver en Mis Tickets/i })).toBeInTheDocument();

    // Probar imprimir
    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const printBtn = screen.getByRole('button', { name: /Imprimir \/ PDF/i });
    fireEvent.click(printBtn);
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();

    // Cambiar a pestaña Mis Tickets: guarda el boleto en caché offline y solicita SMS para consultar historial
    const verTicketsBtn = screen.getByRole('button', { name: /Ver en Mis Tickets/i });
    fireEvent.click(verTicketsBtn);

    expect(await screen.findByText(/Recupera tus Tickets por Teléfono \(SMS\)/i)).toBeInTheDocument();
    expect(localStorage.getItem('xilotzin_mis_tickets')).toContain('PRE-XIL-35677');
  });

  test('en Mis Tickets oculta pruebas previas de otros teléfonos hasta verificar por SMS y reemplaza caché', async () => {
    localStorage.setItem(
      'xilotzin_mis_tickets',
      JSON.stringify([
        {
          idPreorden: 10,
          codigo: 'PRE-XIL-OLD01',
          cliente: 'Otro Cliente',
          telefono: '5599999999',
          pelicula: 'Prueba Anterior',
          horario: '15:00',
          idFuncion: 99,
          boletosGeneral: 1,
          precioBoleto: 50,
          asientos: [],
          combos: [],
          total: 50,
          fechaCreacion: '2026-11-01',
          vigenciaDias: 12,
          estadoActivo: true,
        },
      ])
    );

    mockGet.mockReturnValue('tickets');
    (carteleraService.solicitarCodigoPreordenes as jest.Mock).mockResolvedValueOnce({
      enviado: true,
      telefonoEnmascarado: '******4567',
      expiraEnMinutos: 10,
      message: 'Código enviado',
    });
    (carteleraService.verificarCodigoPreordenes as jest.Mock).mockResolvedValueOnce([
      {
        idPreorden: 77,
        codigo: 'PRE-XIL-77701',
        cliente: 'Alberto Cruz',
        telefono: '7731234567',
        pelicula: 'La posesión de la momia',
        horario: '19:00',
        idFuncion: 102,
        boletosGeneral: 2,
        precioBoleto: 50,
        asientos: [],
        combos: [],
        total: 100,
        fechaCreacion: '2026-11-10',
        vigenciaDias: 12,
        estadoActivo: true,
      },
    ]);

    const { unmount } = render(<PreordenPage />);

    expect(await screen.findByText(/Recupera tus Tickets por Teléfono \(SMS\)/i)).toBeInTheDocument();
    expect(screen.queryByText('PRE-XIL-OLD01')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Teléfono registrado/i), { target: { value: '7731234567' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar código SMS/i }));

    fireEvent.change(await screen.findByLabelText(/Código de verificación/i), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verificar y Ver Tickets/i }));

    expect(await screen.findByText('PRE-XIL-77701')).toBeInTheDocument();
    expect(screen.queryByText('PRE-XIL-OLD01')).not.toBeInTheDocument();
    expect(localStorage.getItem('xilotzin_mis_tickets')).toContain('PRE-XIL-77701');
    expect(localStorage.getItem('xilotzin_mis_tickets')).not.toContain('PRE-XIL-OLD01');
    expect(localStorage.getItem('xilotzin_verified_phone')).toBe('7731234567');

    // Simular recarga (F5): mantiene la sesión verificada sin volver a pedir SMS
    unmount();
    render(<PreordenPage />);
    expect(await screen.findByText('PRE-XIL-77701')).toBeInTheDocument();
    expect(screen.getByText(/Verificado: \+52 \*\*\*\*\*\*4567/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Teléfono registrado/i)).not.toBeInTheDocument();

    // Pulsar Consultar otro número limpia la verificación y pide SMS otra vez
    fireEvent.click(screen.getByRole('button', { name: /Consultar otro número/i }));
    expect(await screen.findByLabelText(/Teléfono registrado/i)).toBeInTheDocument();
    expect(localStorage.getItem('xilotzin_verified_phone')).toBeNull();
  });
});

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

    // Boletos pasa de 2 a 3: 3 * 50 = $150 MXN
    expect(screen.getAllByText('$150 MXN').length).toBeGreaterThanOrEqual(1);

    const menosBtn = screen.getByRole('button', { name: /Restar un boleto/i });
    fireEvent.click(menosBtn);
    // Vuelve a 2: 2 * 50 = $100 MXN
    expect(screen.getAllByText('$100 MXN').length).toBeGreaterThanOrEqual(1);
  });

  test('permite agregar combos y actualizar el subtotal', async () => {
    render(<PreordenPage />);

    await screen.findAllByText('La posesión de la momia');
    expect(await screen.findByText('Combo Pareja Xilotzin')).toBeInTheDocument();

    const agregarComboBtn = screen.getByRole('button', { name: /Agregar Combo Pareja Xilotzin/i });
    fireEvent.click(agregarComboBtn);

    // 2 boletos ($100) + 1 combo ($110) = $210 MXN
    expect(screen.getByText('$210 MXN')).toBeInTheDocument();
  });

  test('valida formato de teléfono (debe iniciar con 55 y tener 10 dígitos)', async () => {
    render(<PreordenPage />);

    await screen.findAllByText('La posesión de la momia');

    const telInput = screen.getByLabelText(/Teléfono \/ WhatsApp/i);
    fireEvent.change(telInput, { target: { value: '7221234567' } });

    expect(screen.getByText(/El número de teléfono debe iniciar con 55/i)).toBeInTheDocument();

    fireEvent.change(telInput, { target: { value: '55123' } });
    expect(screen.getByText(/Faltan dígitos: llevas 5 de 10 dígitos/i)).toBeInTheDocument();

    fireEvent.change(telInput, { target: { value: '5512345678' } });
    expect(screen.queryByText(/El número de teléfono debe iniciar con 55/i)).toBeNull();
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

    // Cambiar a pestaña Mis Tickets
    const verTicketsBtn = screen.getByRole('button', { name: /Ver en Mis Tickets/i });
    fireEvent.click(verTicketsBtn);

    // Debe mostrar la pestaña Mis Tickets con el ticket guardado
    const ticketsGuardados = await screen.findAllByText('PRE-XIL-35677');
    expect(ticketsGuardados.length).toBeGreaterThan(0);
  });

  test('muestra estado vacío en Mis Tickets si no hay tickets guardados', async () => {
    mockGet.mockReturnValue('tickets');
    render(<PreordenPage />);

    expect(await screen.findByText('Aún no tienes tickets generados')).toBeInTheDocument();
  });
});

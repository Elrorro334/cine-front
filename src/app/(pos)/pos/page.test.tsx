import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PosPage from './page';
import { taquillaService } from '@/services/taquillaService';
import { PreordenDto, CalcularOrdenRequestDto, StockFraccionadoDto } from '@/types/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/services/authService', () => ({
  authService: {
    getUserSession: jest.fn().mockReturnValue({ idVendedor: 1, nombre: 'Raul', rol: 'Vendedor' }),
    logout: jest.fn(),
  },
}));

jest.mock('@/services/taquillaService', () => ({
  taquillaService: {
    getCartelera: jest.fn(),
    getProductosDulceria: jest.fn(),
    getCatalogoDulceriaPos: jest.fn(),
    buscarProductoPorSku: jest.fn(),
    calcularOrdenPos: jest.fn(),
    getButacasFuncion: jest.fn(),
    registrarVenta: jest.fn(),
    getPreorden: jest.fn(),
  },
}));

const productosMock = [
  {
    idProducto: 1,
    sku: '7501001',
    nombre: 'Palomitas Grandes',
    categoria: 'Snacks',
    precio: 50,
    stock: 30,
  },
  {
    idProducto: 2,
    sku: '7501002',
    nombre: 'Refresco 600ml',
    categoria: 'Bebidas',
    precio: 35,
    stock: 40,
  },
  {
    idProducto: 3,
    sku: '7501003',
    nombre: 'Nachos con Queso',
    categoria: 'Snacks',
    precio: 65,
    stock: 25,
  },
];

const pizzasMock = [
  {
    idProducto: 6,
    sku: '7501006',
    nombre: 'Rebanada Individual',
    categoria: 'Pizzas',
    precio: 35,
    stock: 56,
    esFraccionado: true,
    factorFraccion: 1,
    descripcionDescuento: 'Descuenta 1 rebanada del stock',
  },
  {
    idProducto: 7,
    sku: '7501007',
    nombre: 'Pizza Completa (8 Rebanadas)',
    categoria: 'Pizzas',
    precio: 180,
    stock: 7,
    esFraccionado: true,
    factorFraccion: 8,
    descripcionDescuento: 'Descuenta 8 rebanadas del stock',
  },
];

const stockFraccionadoInicial: StockFraccionadoDto = {
  idStockFraccionado: 1,
  nombreInsumo: 'PIZZAS',
  stockRebanadasActual: 56,
  factorFraccion: 8,
  pizzasCompletasEquivalentes: 7,
  rebanadasSueltas: 0,
  etiquetaMonitor: 'Stock: 56 rebanadas (7 pizzas)',
  productoRebanada: pizzasMock[0],
  productoPizzaCompleta: pizzasMock[1],
};

const crearPreordenMock = (overrides: Partial<PreordenDto> = {}): PreordenDto => ({
  idPreorden: 5,
  codigo: 'PRE-XIL-001',
  cliente: 'Ana López',
  telefono: '5551234567',
  pelicula: 'Avatar',
  horario: '19:00',
  idFuncion: 20,
  boletosGeneral: 2,
  precioBoleto: 50,
  asientos: [],
  combos: [],
  total: 100,
  fechaCreacion: '2026-10-21',
  vigenciaDias: 8,
  estadoActivo: true,
  ...overrides,
});

describe('PosPage Component', () => {
  const escanearQr = async (codigo: string) => {
    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Escanear QR/i }));
    fireEvent.change(screen.getByPlaceholderText(/Escribir o escanear folio/i), {
      target: { value: codigo },
    });
    fireEvent.click(screen.getByRole('button', { name: /Validar e Ingresar/i }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (taquillaService.getCartelera as jest.Mock).mockResolvedValue([
      {
        idPelicula: 1,
        titulo: 'Spider-Man',
        clasificacion: 'A',
        duracion: 120,
        funciones: [{ idFuncion: 10, hora: '15:00:00', precio: 50 }],
      },
    ]);
    (taquillaService.getProductosDulceria as jest.Mock).mockResolvedValue(productosMock);
    (taquillaService.getCatalogoDulceriaPos as jest.Mock).mockResolvedValue({
      snacksYBebidas: productosMock,
      todosLosProductos: [...productosMock, ...pizzasMock],
      stockFraccionado: stockFraccionadoInicial,
    });

    (taquillaService.calcularOrdenPos as jest.Mock).mockImplementation(
      async (req: CalcularOrdenRequestDto) => {
        const todosProductos = [...productosMock, ...pizzasMock];
        const items = (req.itemsActuales ?? []).map((item, idx) => ({
          idLinea: item.tipo === 'boleto' ? `bol_${idx}` : `snk_${item.idProducto ?? item.sku}`,
          idProducto: item.idProducto,
          idFuncion: item.idFuncion,
          sku: item.sku,
          nombre: item.nombre,
          tipo: item.tipo,
          etiquetaCategoria: item.tipo === 'boleto' ? 'TAQUILLA' : 'DULCERÍA',
          cantidad: item.cantidad,
          precioUnitario: item.precio,
          subtotal: item.precio * item.cantidad,
          asientos: item.asientos,
        }));

        if (req.skuAgregar || req.idProductoAgregar) {
          const prod = todosProductos.find(
            (p) => p.sku === req.skuAgregar || p.idProducto === req.idProductoAgregar
          );
          if (prod && prod.stock > 0) {
            const delta = req.cantidadAgregar ?? 1;
            const idx = items.findIndex((i) => i.idProducto === prod.idProducto || i.sku === prod.sku);
            if (idx >= 0) {
              items[idx].cantidad += delta;
              items[idx].subtotal = items[idx].cantidad * items[idx].precioUnitario;
            } else if (delta > 0) {
              items.push({
                idLinea: `snk_${prod.idProducto}`,
                idProducto: prod.idProducto,
                idFuncion: undefined,
                sku: prod.sku,
                nombre: prod.nombre,
                tipo: 'dulceria',
                etiquetaCategoria: 'DULCERÍA',
                cantidad: delta,
                precioUnitario: prod.precio,
                subtotal: prod.precio * delta,
                asientos: undefined,
              });
            }
          }
        }

        const rebanadasEnCarrito = items.reduce((acc, i) => {
          if (i.sku === '7501006') return acc + i.cantidad;
          if (i.sku === '7501007') return acc + i.cantidad * 8;
          return acc;
        }, 0);
        const rebanadasRestantes = 56 - rebanadasEnCarrito;
        const pizzasRestantes = Math.floor(rebanadasRestantes / 8);

        return {
          items,
          totalArticulos: items.reduce((acc, i) => acc + i.cantidad, 0),
          subtotalBoletos: items
            .filter((i) => i.tipo === 'boleto')
            .reduce((acc, i) => acc + i.subtotal, 0),
          subtotalDulceria: items
            .filter((i) => i.tipo !== 'boleto')
            .reduce((acc, i) => acc + i.subtotal, 0),
          totalVenta: items.reduce((acc, i) => acc + i.subtotal, 0),
          stockFraccionado: {
            ...stockFraccionadoInicial,
            stockRebanadasActual: rebanadasRestantes,
            pizzasCompletasEquivalentes: pizzasRestantes,
            etiquetaMonitor: `Stock: ${rebanadasRestantes} rebanadas (${pizzasRestantes} pizzas)`,
          },
        };
      }
    );

    (taquillaService.getButacasFuncion as jest.Mock).mockResolvedValue({
      idFuncion: 10,
      idSala: 1,
      nombreSala: 'Sala 1',
      precio: 50,
      butacas: [{ idButaca: 1, fila: 'A', numero: 1, codigo: 'A1', estaOcupada: false }],
    });
    (taquillaService.registrarVenta as jest.Mock).mockResolvedValue({
      idVenta: 100,
      folio: 'VT-00100',
      total: 115,
      fechaHora: '2026-10-21T18:00:00Z',
      metodoPago: 'Efectivo',
      mensaje: 'OK',
    });
  });

  test('renderiza la cartelera y abre el modal de butacas al seleccionar horario', async () => {
    render(<PosPage />);

    expect(screen.getByText('Xilotzin POS')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    const funcionBtn = screen.getByRole('button', { name: '15:00' });
    fireEvent.click(funcionBtn);

    await waitFor(() => {
      expect(taquillaService.getButacasFuncion).toHaveBeenCalledWith(10);
      expect(screen.getAllByText(/Spider-Man/i).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Butaca A1' }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar a Venta/i }));

    await waitFor(() => {
      expect(screen.getByText(/Spider-Man \(15:00\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Asientos: A1/i)).toBeInTheDocument();
    });
  });

  test('permite agregar productos de dulcería y procesar cobro en efectivo', async () => {
    render(<PosPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    // Ir al Paso 2: Dulcería & Combos
    fireEvent.click(screen.getByRole('button', { name: /2\. Dulcería & Combos/i }));

    await waitFor(() => {
      expect(screen.getByText('Palomitas Grandes')).toBeInTheDocument();
    });

    // Agregar palomitas al carrito
    const botonesAgregar = screen.getAllByRole('button', { name: /Agregar/i });
    fireEvent.click(botonesAgregar[0]);

    await waitFor(() => {
      expect(taquillaService.calcularOrdenPos).toHaveBeenCalled();
    });

    // Ir al Paso 3: Cobro
    fireEvent.click(screen.getByRole('button', { name: /Paso 3: Cobrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/Confirmar Pago en Efectivo/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Pago en Efectivo/i }));

    await waitFor(() => {
      expect(taquillaService.registrarVenta).toHaveBeenCalled();
    });
  });

  test('HU-07 Escenario 1: escanear código de barras SKU 7501001 agrega Palomitas Grandes ($50.00) al resumen', async () => {
    render(<PosPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /2\. Dulcería & Combos/i }));

    const inputSku = await screen.findByPlaceholderText(/ESCANEAR SKU \(EJ: 7501001\)/i);
    fireEvent.change(inputSku, { target: { value: '7501001' } });
    fireEvent.keyDown(inputSku, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(taquillaService.calcularOrdenPos).toHaveBeenCalledWith(
        expect.objectContaining({
          skuAgregar: '7501001',
          cantidadAgregar: 1,
        })
      );
      expect(screen.getByText('1 items')).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });
  });

  test('HU-07 Escenario 2: clic táctil en tarjeta Nachos con Queso agrega 1 unidad ($65.00) a la orden', async () => {
    render(<PosPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /2\. Dulcería & Combos/i }));

    const nachosCard = await screen.findByText('Nachos con Queso');
    fireEvent.click(nachosCard);

    await waitFor(() => {
      expect(taquillaService.calcularOrdenPos).toHaveBeenCalledWith(
        expect.objectContaining({
          idProductoAgregar: 3,
          skuAgregar: '7501003',
          cantidadAgregar: 1,
        })
      );
      expect(screen.getByText('$65.00')).toBeInTheDocument();
    });
  });

  test('HU-07 Escenario 3: seleccionar Rebanada Individual actualiza el monitor de 56 rebanadas a 55 rebanadas en tiempo real', async () => {
    render(<PosPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /2\. Dulcería & Combos/i }));

    const monitor = await screen.findByTestId('pizza-stock-monitor');
    expect(monitor).toHaveTextContent('Stock: 56 rebanadas (7 pizzas)');

    const rebanadaBtn = screen.getByRole('button', { name: /Rebanada Individual/i });
    fireEvent.click(rebanadaBtn);

    await waitFor(() => {
      expect(screen.getByTestId('pizza-stock-monitor')).toHaveTextContent(
        'Stock: 55 rebanadas (6 pizzas)'
      );
      expect(screen.getAllByText('$35.00').length).toBeGreaterThan(0);
    });
  });

  test('al canjear una pre-orden QR exige exactamente sus butacas y agrega combos', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(
      crearPreordenMock({
        combos: [{ nombre: 'Combo Pareja', cantidad: 1, precio: 110 }],
        total: 210,
      })
    );
    (taquillaService.getButacasFuncion as jest.Mock).mockResolvedValue({
      idFuncion: 20,
      idSala: 1,
      nombreSala: 'Sala 1',
      precio: 50,
      butacas: [
        { idButaca: 1, fila: 'A', numero: 1, codigo: 'A1', estaOcupada: false },
        { idButaca: 2, fila: 'A', numero: 2, codigo: 'A2', estaOcupada: false },
        { idButaca: 3, fila: 'A', numero: 3, codigo: 'A3', estaOcupada: false },
      ],
    });

    render(<PosPage />);
    await escanearQr('pre-xil-001');

    await waitFor(() => {
      expect(taquillaService.getPreorden).toHaveBeenCalledWith('PRE-XIL-001');
      expect(taquillaService.getButacasFuncion).toHaveBeenCalledWith(20);
    });

    expect(screen.getByText(/Selecciona exactamente/i)).toBeInTheDocument();

    const confirmar = screen.getByRole('button', { name: /Agregar a Venta/i });
    expect(confirmar).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Butaca A1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Butaca A2' }));

    expect(confirmar).toBeEnabled();
    fireEvent.click(confirmar);

    await waitFor(() => {
      expect(screen.getByText(/Avatar \(19:00\) - Ana López/i)).toBeInTheDocument();
      expect(screen.getByText(/Asientos: A1, A2/i)).toBeInTheDocument();
      expect(screen.getByText('Combo Pareja')).toBeInTheDocument();
    });
  });

  test('rechaza una pre-orden inactiva sin abrir el mapa de butacas', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(
      crearPreordenMock({
        idPreorden: 6,
        codigo: 'PRE-XIL-002',
        estadoActivo: false,
      })
    );

    render(<PosPage />);
    await escanearQr('PRE-XIL-002');

    await waitFor(() => {
      expect(screen.getByText(/cancelada o inactiva/i)).toBeInTheDocument();
    });
    expect(taquillaService.getButacasFuncion).not.toHaveBeenCalled();
  });

  test('rechaza una pre-orden sin boletos para canjear', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(
      crearPreordenMock({
        idPreorden: 7,
        codigo: 'PRE-XIL-004',
        boletosGeneral: 0,
        total: 0,
      })
    );

    render(<PosPage />);
    await escanearQr('PRE-XIL-004');

    await waitFor(() => {
      expect(screen.getByText(/no contiene boletos/i)).toBeInTheDocument();
    });
    expect(taquillaService.getButacasFuncion).not.toHaveBeenCalled();
  });

  test('rechaza un código QR que no existe en la base de datos', async () => {
    (taquillaService.getPreorden as jest.Mock).mockResolvedValue(null);

    render(<PosPage />);
    await escanearQr('PRE-INEXISTENTE');

    await waitFor(() => {
      expect(screen.getByText(/no encontrado en base de datos/i)).toBeInTheDocument();
    });
    expect(taquillaService.getButacasFuncion).not.toHaveBeenCalled();
  });

  test('muestra un mensaje cuando la pre-orden no se puede validar', async () => {
    (taquillaService.getPreorden as jest.Mock).mockRejectedValue(new Error('fallo de red'));

    render(<PosPage />);
    await escanearQr('PRE-XIL-003');

    await waitFor(() => {
      expect(screen.getByText(/Error al validar la pre-orden/i)).toBeInTheDocument();
    });
  });

  test('abre el modal de registro TMDB al hacer clic en + Película (TMDB)', async () => {
    render(<PosPage />);

    await waitFor(() => {
      expect(screen.getByText('Spider-Man')).toBeInTheDocument();
    });

    const tmdbBtn = screen.getByRole('button', { name: /\+ Película \(TMDB\)/i });
    fireEvent.click(tmdbBtn);

    expect(screen.getByText(/Registrar Película desde TMDB/i)).toBeInTheDocument();
  });
});

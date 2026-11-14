import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InventarioAdminView from './InventarioAdminView';
import { inventarioService } from '@/services/inventarioService';
import {
  InsumoInventarioDto,
  EntradaHistorialDto,
  InventarioPaginadoDto,
} from '@/types/inventario';

jest.mock('@/services/inventarioService', () => ({
  inventarioService: {
    getInsumos: jest.fn(),
    getInsumosPaginado: jest.fn(),
    actualizarPrecios: jest.fn(),
    getHistorialEntradas: jest.fn(),
    registrarEntrada: jest.fn(),
    getProveedores: jest.fn(),
  },
}));

describe('InventarioAdminView Component (HU-11)', () => {
  const mockInsumos: InsumoInventarioDto[] = [
    {
      idProducto: 1,
      sku: '7501001',
      producto: 'Palomitas Clásicas',
      categoria: 'Snacks',
      stockActual: 150,
      minimoAlerta: 20,
      costoUnitario: 15.0,
      precioVenta: 65.0,
      margenPorcentaje: 76.92,
      enAlerta: false,
      factorEquivalencia: 1,
      icono: 'fa-popcorn',
    },
    {
      idProducto: 2,
      sku: '7501003',
      producto: 'Nachos con Queso',
      categoria: 'Comida',
      stockActual: 15,
      minimoAlerta: 15,
      costoUnitario: 18.0,
      precioVenta: 55.0,
      margenPorcentaje: 67.27,
      enAlerta: true, // Criterio 1: StockActual <= MinimoAlerta
      factorEquivalencia: 1,
      icono: 'fa-burger',
    },
    {
      idProducto: 3,
      sku: '7501006',
      producto: 'Pizza Personal Pepperoni',
      categoria: 'Pizzas',
      stockActual: 40,
      minimoAlerta: 10,
      costoUnitario: 25.0,
      precioVenta: 75.0,
      margenPorcentaje: 66.67,
      enAlerta: false,
      factorEquivalencia: 8, // Stock fraccionado (Regla 1)
      icono: 'fa-pizza-slice',
    },
  ];

  const mockPaginado: InventarioPaginadoDto = {
    items: mockInsumos,
    paginaActual: 1,
    tamanoPagina: 15,
    totalRegistros: 3,
    totalPaginas: 1,
    totalEnAlerta: 1,
    totalAgotados: 0,
    categoriasDisponibles: ['Bebidas', 'Comida', 'Dulces', 'Pizzas', 'Snacks'],
  };

  const mockEntradas: EntradaHistorialDto[] = [
    {
      idFactura: 1,
      proveedor: 'Distribuidora Central de Dulces',
      factura: 'F-9021',
      totalPagado: 650.0,
      fechaRegistro: '2026-11-04T10:00:00Z',
      lineas: [
        {
          idEntrada: 1,
          idProducto: 1,
          producto: 'Palomitas Clásicas',
          sku: '7501001',
          cantidadComprada: 50,
          factorEquivalencia: 1,
          cantidadStockAgregada: 50,
          costoUnitario: 13.0,
          costoTotal: 650.0,
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (inventarioService.getInsumos as jest.Mock).mockResolvedValue(mockInsumos);
    (inventarioService.getInsumosPaginado as jest.Mock).mockResolvedValue(mockPaginado);
    (inventarioService.getHistorialEntradas as jest.Mock).mockResolvedValue(mockEntradas);
    (inventarioService.getProveedores as jest.Mock).mockResolvedValue([
      { idProveedor: 1, nombre: 'Distribuidora Central de Dulces' },
    ]);
  });

  test('renderiza las 8 columnas requeridas del Inventario Maestro y la Tabla de Entradas', async () => {
    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByText('Palomitas Clásicas')).toBeInTheDocument();
      expect(screen.getByText('Tabla 1: Inventario Maestro de Insumos')).toBeInTheDocument();
      expect(screen.getByText('Tabla 2: Historial de Entradas de Mercancía')).toBeInTheDocument();
    });

    // 8 Columnas
    expect(screen.getByText('1. SKU')).toBeInTheDocument();
    expect(screen.getByText('2. Producto')).toBeInTheDocument();
    expect(screen.getByText('3. Categoría')).toBeInTheDocument();
    expect(screen.getByText('4. Stock Actual')).toBeInTheDocument();
    expect(screen.getByText('5. Mínimo de Alerta')).toBeInTheDocument();
    expect(screen.getByText('6. Costo Unitario')).toBeInTheDocument();
    expect(screen.getByText('7. Precio de Venta')).toBeInTheDocument();
    expect(screen.getByText('8. Margen (%)')).toBeInTheDocument();

    // Columnas de Tabla 2
    expect(screen.getByText('1. Proveedor')).toBeInTheDocument();
    expect(screen.getByText('2. Factura')).toBeInTheDocument();
    expect(screen.getByText('3. Total Pagado')).toBeInTheDocument();

    // Datos mostrados
    expect(screen.getByText('Nachos con Queso')).toBeInTheDocument();
    expect(screen.getByText('F-9021')).toBeInTheDocument();
    expect(screen.getByText('Distribuidora Central de Dulces')).toBeInTheDocument();
  });

  test('Criterio 1: Resalta visualmente el registro cuando StockActual <= MinimoAlerta (Desabasto)', async () => {
    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByText('Nachos con Queso')).toBeInTheDocument();
    });

    const badges = screen.getAllByText(/Desabasto/i);
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  test('Criterio 2: Abre el modal "Registrar Entrada" al hacer clic en el botón principal', async () => {
    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByText('Registrar Entrada')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Registrar Entrada'));

    await waitFor(() => {
      expect(screen.getByText('Registrar Entrada de Mercancía')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ej. F-9021')).toBeInTheDocument();
    });
  });

  test('Criterio 3: Abre modal de edición de precios y recalcula instantáneamente el margen', async () => {
    (inventarioService.actualizarPrecios as jest.Mock).mockResolvedValueOnce({
      ...mockInsumos[0],
      costoUnitario: 20.0,
      precioVenta: 80.0,
      margenPorcentaje: 75.0,
    });

    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getAllByText('Palomitas Clásicas')[0]).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText(/Editar/i);
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Editar Precios y Costos')).toBeInTheDocument();
    });

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '20' } });
    fireEvent.change(inputs[1], { target: { value: '80' } });

    fireEvent.click(screen.getByText('Guardar y Recalcular'));

    await waitFor(() => {
      expect(inventarioService.actualizarPrecios).toHaveBeenCalledWith(1, {
        costoUnitario: 20,
        precioVenta: 80,
      });
    });
  });

  test('Filtro de categorías dinámicas (incluyendo Pizzas) solicita datos paginados al backend', async () => {
    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Pizzas' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Snacks' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Pizzas' }));

    await waitFor(() => {
      expect(inventarioService.getInsumosPaginado).toHaveBeenCalledWith(
        expect.objectContaining({
          categoria: 'Pizzas',
          pagina: 1,
          tamanoPagina: 15,
        })
      );
    });
  });

  test('Paginación de 15 registros por página navega entre páginas correctamente', async () => {
    (inventarioService.getInsumosPaginado as jest.Mock).mockResolvedValue({
      ...mockPaginado,
      totalRegistros: 32,
      totalPaginas: 3,
      paginaActual: 1,
    });

    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 3/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Página 2' }));

    await waitFor(() => {
      expect(inventarioService.getInsumosPaginado).toHaveBeenCalledWith(
        expect.objectContaining({
          pagina: 2,
          tamanoPagina: 15,
        })
      );
    });
  });

  test('Buscador aplica búsqueda al enviar y limpia con el botón limpiar', async () => {
    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Buscar por SKU, Producto o Categoría/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por SKU, Producto o Categoría/i);
    fireEvent.change(searchInput, { target: { value: '7501001' } });
    fireEvent.submit(searchInput.closest('form')!);

    await waitFor(() => {
      expect(inventarioService.getInsumosPaginado).toHaveBeenCalledWith(
        expect.objectContaining({
          busqueda: '7501001',
          pagina: 1,
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));

    await waitFor(() => {
      expect(searchInput).toHaveValue('');
    });
  });

  test('Filtros de estado de stock y ordenamiento envían parámetros al backend', async () => {
    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /En Alerta/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /En Alerta/i }));

    await waitFor(() => {
      expect(inventarioService.getInsumosPaginado).toHaveBeenCalledWith(
        expect.objectContaining({
          estadoStock: 'alerta',
          pagina: 1,
        })
      );
    });

    const sortSelect = screen.getByLabelText(/Ordenar/i);
    fireEvent.change(sortSelect, { target: { value: 'stock_asc' } });

    await waitFor(() => {
      expect(inventarioService.getInsumosPaginado).toHaveBeenCalledWith(
        expect.objectContaining({
          estadoStock: 'alerta',
          ordenarPor: 'stock_asc',
          pagina: 1,
        })
      );
    });
  });
});

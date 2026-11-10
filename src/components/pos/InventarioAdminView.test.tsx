import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import InventarioAdminView from './InventarioAdminView';
import { inventarioService } from '@/services/inventarioService';
import { InsumoInventarioDto, EntradaHistorialDto } from '@/types/inventario';

jest.mock('@/services/inventarioService', () => ({
  inventarioService: {
    getInsumos: jest.fn(),
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
      categoria: 'Comida',
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

    // Nachos tiene enAlerta = true -> debe tener el badge "Desabasto"
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

    // Modificar valores
    const inputs = screen.getAllByRole('spinbutton');
    // inputs[0] = Costo Unitario, inputs[1] = Precio de Venta
    fireEvent.change(inputs[0], { target: { value: '20' } });
    fireEvent.change(inputs[1], { target: { value: '80' } });

    // Guardar
    fireEvent.click(screen.getByText('Guardar y Recalcular'));

    await waitFor(() => {
      expect(inventarioService.actualizarPrecios).toHaveBeenCalledWith(1, {
        costoUnitario: 20,
        precioVenta: 80,
      });
    });
  });

  test('Filtro de categorías preexistentes interactúa y recarga datos', async () => {
    render(<InventarioAdminView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Snacks' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Snacks' }));

    await waitFor(() => {
      expect(inventarioService.getInsumos).toHaveBeenCalledWith(
        expect.objectContaining({ categoria: 'Snacks' })
      );
    });
  });
});

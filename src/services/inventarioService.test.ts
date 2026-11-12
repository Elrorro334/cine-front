import { inventarioService } from './inventarioService';

global.fetch = jest.fn();

describe('inventarioService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getInsumos construye query params y obtiene la lista de insumos', async () => {
    const mockInsumos = [
      {
        idProducto: 1,
        sku: '7501001',
        producto: 'Palomitas Clásicas',
        categoria: 'Snacks',
        stockActual: 100,
        minimoAlerta: 20,
        costoUnitario: 15,
        precioVenta: 65,
        margenPorcentaje: 76.92,
        enAlerta: false,
        factorEquivalencia: 1,
        icono: 'fa-popcorn',
      },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockInsumos,
    });

    const res = await inventarioService.getInsumos({
      categoria: 'Snacks',
      busqueda: 'palomitas',
    });

    expect(res).toHaveLength(1);
    expect(res[0].producto).toBe('Palomitas Clásicas');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventario/insumos?categoria=Snacks&busqueda=palomitas'),
      expect.any(Object)
    );
  });

  test('actualizarPrecios realiza PUT con el body correcto', async () => {
    const mockUpdated = {
      idProducto: 2,
      sku: '7501002',
      producto: 'Refresco 1L',
      categoria: 'Bebidas',
      stockActual: 200,
      minimoAlerta: 30,
      costoUnitario: 12,
      precioVenta: 48,
      margenPorcentaje: 75,
      enAlerta: false,
      factorEquivalencia: 1,
      icono: 'fa-glass-water',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUpdated,
    });

    const res = await inventarioService.actualizarPrecios(2, {
      costoUnitario: 12,
      precioVenta: 48,
    });

    expect(res.margenPorcentaje).toBe(75);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventario/insumos/2/precios'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ costoUnitario: 12, precioVenta: 48 }),
      })
    );
  });

  test('registrarEntrada realiza POST con los datos de factura', async () => {
    const mockEntrada = {
      idFactura: 5,
      proveedor: 'Distribuidora Central de Dulces',
      factura: 'F-9021',
      totalPagado: 650,
      fechaRegistro: '2026-11-04T12:00:00Z',
      lineas: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEntrada,
    });

    const payload = {
      idProveedor: 1,
      folioFactura: 'F-9021',
      totalPagado: 650,
      lineas: [{ idProducto: 5, cantidad: 50, costoUnitario: 13 }],
    };

    const res = await inventarioService.registrarEntrada(payload);

    expect(res.factura).toBe('F-9021');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventario/entradas'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  test('getHistorialEntradas consulta el endpoint de entradas', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const res = await inventarioService.getHistorialEntradas(20);
    expect(Array.isArray(res)).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventario/entradas?limite=20'),
      expect.any(Object)
    );
  });

  test('getInsumosPaginado envía parámetros de paginación, búsqueda, estado y ordenamiento', async () => {
    const mockPaginado = {
      items: [],
      paginaActual: 2,
      tamanoPagina: 15,
      totalRegistros: 30,
      totalPaginas: 2,
      totalEnAlerta: 3,
      totalAgotados: 1,
      categoriasDisponibles: ['Bebidas', 'Comida', 'Dulces', 'Pizzas', 'Snacks'],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPaginado,
    });

    const res = await inventarioService.getInsumosPaginado({
      categoria: 'Pizzas',
      busqueda: 'pepperoni',
      estadoStock: 'alerta',
      ordenarPor: 'stock_asc',
      pagina: 2,
      tamanoPagina: 15,
    });

    expect(res.paginaActual).toBe(2);
    expect(res.tamanoPagina).toBe(15);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/inventario/insumos/paginado?categoria=Pizzas&busqueda=pepperoni&estadoStock=alerta&ordenarPor=stock_asc&pagina=2&tamanoPagina=15'
      ),
      expect.any(Object)
    );
  });

  test('getProveedores consulta el catálogo de proveedores', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ idProveedor: 1, nombre: 'Distribuidora Central' }],
    });

    const res = await inventarioService.getProveedores();
    expect(res).toHaveLength(1);
    expect(res[0].nombre).toBe('Distribuidora Central');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/inventario/proveedores'),
      expect.any(Object)
    );
  });
});

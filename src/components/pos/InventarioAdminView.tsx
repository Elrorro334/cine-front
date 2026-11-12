'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  InsumoInventarioDto,
  EntradaHistorialDto,
  EstadoStockFiltro,
  OrdenInventario,
} from '@/types/inventario';
import { inventarioService } from '@/services/inventarioService';
import RegistrarEntradaModal from './RegistrarEntradaModal';

const TAMANO_PAGINA = 15;
const CATEGORIAS_INICIALES = ['Snacks', 'Bebidas', 'Dulces', 'Comida', 'Pizzas'];

type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

function getMargenBadgeClass(margen: number): string {
  if (margen >= 60) {
    return 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30';
  }
  if (margen >= 30) {
    return 'bg-blue-950/40 text-blue-400 border border-blue-500/30';
  }
  return 'bg-red-950/40 text-red-400 border border-red-500/30';
}

function getExpandIcon(isExpanded: boolean): string {
  return isExpanded ? 'fa-chevron-up' : 'fa-chevron-down';
}

function getExpandText(isExpanded: boolean): string {
  return isExpanded ? 'Ocultar' : 'Ver líneas';
}

function getPreviewMargenClass(margen: number): string {
  return margen >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function buildPageNumbers(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const tokens: PageToken[] = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    tokens.push('ellipsis-left');
  }
  for (let p = start; p <= end; p++) {
    tokens.push(p);
  }
  if (end < totalPages - 1) {
    tokens.push('ellipsis-right');
  }
  tokens.push(totalPages);

  return tokens;
}

function formatRangeText(paginaActual: number, tamanoPagina: number, totalRegistros: number): string {
  if (totalRegistros === 0) {
    return 'Mostrando 0 de 0 insumos';
  }
  const inicio = (paginaActual - 1) * tamanoPagina + 1;
  const fin = Math.min(paginaActual * tamanoPagina, totalRegistros);
  return `Mostrando ${inicio.toLocaleString('es-MX')}–${fin.toLocaleString('es-MX')} de ${totalRegistros.toLocaleString('es-MX')} insumos`;
}

export default function InventarioAdminView() {
  const [insumos, setInsumos] = useState<InsumoInventarioDto[]>([]);
  const [catalogoInsumos, setCatalogoInsumos] = useState<InsumoInventarioDto[]>([]);
  const [entradas, setEntradas] = useState<EntradaHistorialDto[]>([]);
  const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>(CATEGORIAS_INICIALES);

  // Filtros, búsqueda, ordenamiento y paginación sincronizados con el backend
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [estadoStock, setEstadoStock] = useState<EstadoStockFiltro>('todos');
  const [ordenarPor, setOrdenarPor] = useState<OrdenInventario>('categoria_nombre');
  const [busquedaInput, setBusquedaInput] = useState<string>('');
  const [busquedaAplicada, setBusquedaAplicada] = useState<string>('');
  const [pagina, setPagina] = useState<number>(1);

  // Metadatos de paginación y alertas calculados en servidor
  const [totalRegistros, setTotalRegistros] = useState<number>(0);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);
  const [totalEnAlerta, setTotalEnAlerta] = useState<number>(0);
  const [totalAgotados, setTotalAgotados] = useState<number>(0);

  // Estados de carga y modales
  const [loadingInsumos, setLoadingInsumos] = useState<boolean>(true);
  const [loadingEntradas, setLoadingEntradas] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InsumoInventarioDto | null>(null);
  const [editCosto, setEditCosto] = useState<string>('');
  const [editPrecio, setEditPrecio] = useState<string>('');
  const [savingPrices, setSavingPrices] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [expandedFacturaId, setExpandedFacturaId] = useState<number | null>(null);

  // Debounce del buscador (300ms) para evitar peticiones redundantes al backend
  useEffect(() => {
    const trimmed = busquedaInput.trim();
    if (trimmed === busquedaAplicada) return;

    const timer = setTimeout(() => {
      setLoadingInsumos(true);
      setBusquedaAplicada(trimmed);
      setPagina(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [busquedaInput, busquedaAplicada]);

  const aplicarRespuestaPaginada = useCallback(
    (data: Awaited<ReturnType<typeof inventarioService.getInsumosPaginado>>) => {
      setInsumos(data.items);
      setTotalRegistros(data.totalRegistros);
      setTotalPaginas(Math.max(1, data.totalPaginas));
      setTotalEnAlerta(data.totalEnAlerta);
      setTotalAgotados(data.totalAgotados);
      if (data.categoriasDisponibles && data.categoriasDisponibles.length > 0) {
        setCategoriasDisponibles(data.categoriasDisponibles);
      }
      if (data.paginaActual > 0 && data.paginaActual !== pagina) {
        setPagina(data.paginaActual);
      }
    },
    [pagina]
  );

  const recargarPaginaInsumos = useCallback(async () => {
    setLoadingInsumos(true);
    try {
      const data = await inventarioService.getInsumosPaginado({
        categoria: selectedCategoria !== 'Todas' ? selectedCategoria : undefined,
        busqueda: busquedaAplicada || undefined,
        estadoStock,
        ordenarPor,
        pagina,
        tamanoPagina: TAMANO_PAGINA,
      });
      aplicarRespuestaPaginada(data);
    } catch (err) {
      console.error('Error al cargar inventario paginado:', err);
    } finally {
      setLoadingInsumos(false);
    }
  }, [selectedCategoria, busquedaAplicada, estadoStock, ordenarPor, pagina, aplicarRespuestaPaginada]);

  const recargarDatosSecundarios = useCallback(async () => {
    setLoadingEntradas(true);
    try {
      const [entradasData, catalogoData] = await Promise.all([
        inventarioService.getHistorialEntradas(20),
        inventarioService.getInsumos(),
      ]);
      setEntradas(entradasData);
      setCatalogoInsumos(catalogoData);
    } catch (err) {
      console.error('Error al cargar historial o catálogo completo:', err);
    } finally {
      setLoadingEntradas(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    inventarioService
      .getInsumosPaginado({
        categoria: selectedCategoria !== 'Todas' ? selectedCategoria : undefined,
        busqueda: busquedaAplicada || undefined,
        estadoStock,
        ordenarPor,
        pagina,
        tamanoPagina: TAMANO_PAGINA,
      })
      .then((data) => {
        if (isMounted) {
          aplicarRespuestaPaginada(data);
          setLoadingInsumos(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error al cargar inventario paginado:', err);
          setLoadingInsumos(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCategoria, busquedaAplicada, estadoStock, ordenarPor, pagina, aplicarRespuestaPaginada]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([inventarioService.getHistorialEntradas(20), inventarioService.getInsumos()])
      .then(([entradasData, catalogoData]) => {
        if (isMounted) {
          setEntradas(entradasData);
          setCatalogoInsumos(catalogoData);
          setLoadingEntradas(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error al cargar historial o catálogo completo:', err);
          setLoadingEntradas(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSuccessEntrada = useCallback(async () => {
    await Promise.all([recargarPaginaInsumos(), recargarDatosSecundarios()]);
  }, [recargarPaginaInsumos, recargarDatosSecundarios]);

  const handleSelectCategoria = (cat: string) => {
    if (cat === selectedCategoria && pagina === 1) return;
    setLoadingInsumos(true);
    setSelectedCategoria(cat);
    setPagina(1);
  };

  const handleSelectEstadoStock = (estado: EstadoStockFiltro) => {
    if (estado === estadoStock && pagina === 1) return;
    setLoadingInsumos(true);
    setEstadoStock(estado);
    setPagina(1);
  };

  const handleChangeOrden = (orden: OrdenInventario) => {
    if (orden === ordenarPor && pagina === 1) return;
    setLoadingInsumos(true);
    setOrdenarPor(orden);
    setPagina(1);
  };

  const handleChangePagina = (nuevaPagina: number) => {
    if (nuevaPagina === pagina || nuevaPagina < 1 || nuevaPagina > totalPaginas) return;
    setLoadingInsumos(true);
    setPagina(nuevaPagina);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = busquedaInput.trim();
    if (trimmed === busquedaAplicada && pagina === 1) return;
    setLoadingInsumos(true);
    setBusquedaAplicada(trimmed);
    setPagina(1);
  };

  const handleClearSearch = () => {
    setBusquedaInput('');
    if (busquedaAplicada === '' && pagina === 1) return;
    setLoadingInsumos(true);
    setBusquedaAplicada('');
    setPagina(1);
  };

  const handleResetFiltros = () => {
    setLoadingInsumos(true);
    setSelectedCategoria('Todas');
    setEstadoStock('todos');
    setOrdenarPor('categoria_nombre');
    setBusquedaInput('');
    setBusquedaAplicada('');
    setPagina(1);
  };

  const hayFiltrosActivos =
    selectedCategoria !== 'Todas' ||
    estadoStock !== 'todos' ||
    ordenarPor !== 'categoria_nombre' ||
    busquedaAplicada.length > 0;

  const categoriasPills = useMemo(
    () => ['Todas', ...categoriasDisponibles],
    [categoriasDisponibles]
  );

  const pageTokens = useMemo(
    () => buildPageNumbers(pagina, totalPaginas),
    [pagina, totalPaginas]
  );

  const handleOpenEdit = (item: InsumoInventarioDto) => {
    setEditingItem(item);
    setEditCosto(item.costoUnitario.toString());
    setEditPrecio(item.precioVenta.toString());
    setEditError(null);
  };

  const handleCloseEdit = () => {
    setEditingItem(null);
    setEditError(null);
  };

  const handleGuardarPrecios = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    if (!editingItem) return;

    const costoNum = Number.parseFloat(editCosto);
    const precioNum = Number.parseFloat(editPrecio);

    if (Number.isNaN(costoNum) || costoNum < 0) {
      setEditError('El costo unitario debe ser un número mayor o igual a 0.');
      return;
    }

    if (Number.isNaN(precioNum) || precioNum < 0) {
      setEditError('El precio de venta debe ser un número mayor o igual a 0.');
      return;
    }

    // Validación preliminar en front para feedback inmediato (Regla 2)
    if (precioNum < costoNum) {
      setEditError('El precio de venta no puede ser menor al costo unitario (Protección de margen negativo).');
      return;
    }

    setSavingPrices(true);
    setEditError(null);

    try {
      const updated = await inventarioService.actualizarPrecios(editingItem.idProducto, {
        costoUnitario: costoNum,
        precioVenta: precioNum,
      });

      setInsumos((prev) =>
        prev.map((item) => (item.idProducto === updated.idProducto ? updated : item))
      );
      setCatalogoInsumos((prev) =>
        prev.map((item) => (item.idProducto === updated.idProducto ? updated : item))
      );
      handleCloseEdit();
      void recargarPaginaInsumos();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar precios';
      setEditError(msg);
    } finally {
      setSavingPrices(false);
    }
  };

  // Preview dinámico del margen en el modal de edición
  const previewCosto = Number.parseFloat(editCosto) || 0;
  const previewPrecio = Number.parseFloat(editPrecio) || 0;
  let previewMargen = 0;
  if (previewPrecio > 0) {
    previewMargen = Number((((previewPrecio - previewCosto) / previewPrecio) * 100).toFixed(2));
  }

  const renderInsumosBody = () => {
    if (loadingInsumos) {
      return (
        <tr>
          <td colSpan={9} className="py-12 text-center text-[#737373]">
            <i className="fa-solid fa-spinner fa-spin text-xl text-[#D81B60] mb-2" />
            <p>Cargando inventario maestro...</p>
          </td>
        </tr>
      );
    }

    if (insumos.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="py-10 text-center text-[#737373] space-y-3">
            <p>No se encontraron insumos con los filtros seleccionados.</p>
            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={handleResetFiltros}
                className="px-3.5 py-1.5 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] text-white text-xs font-semibold border border-[#333333] transition-colors"
              >
                <i className="fa-solid fa-rotate-left mr-1.5" /> Limpiar filtros
              </button>
            )}
          </td>
        </tr>
      );
    }

    return insumos.map((item) => (
      <tr
        key={item.idProducto}
        className={`transition-colors ${
          item.enAlerta
            ? 'bg-amber-950/20 hover:bg-amber-950/30 border-l-4 border-l-amber-500'
            : 'hover:bg-[#161616]'
        }`}
      >
        <td className="py-3 px-4 font-mono text-[#d4d4d4] font-semibold">
          {item.sku}
        </td>
        <td className="py-3 px-4 text-white font-medium">
          <div className="flex items-center gap-2">
            <i className={`fa-solid ${item.icono} text-[#a3a3a3] text-xs`} />
            <span>{item.producto}</span>
          </div>
          {item.factorEquivalencia > 1 && (
            <span className="text-[10px] text-amber-400 block mt-0.5">
              Fraccionado: 1 unid = {item.factorEquivalencia} piezas en POS
            </span>
          )}
        </td>
        <td className="py-3 px-4">
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#222222] text-[#d4d4d4] border border-[#333333]">
            {item.categoria}
          </span>
        </td>
        <td className="py-3 px-4 text-center font-mono">
          <div className="flex flex-col items-center">
            <span
              className={`font-bold text-sm ${
                item.enAlerta ? 'text-amber-400' : 'text-white'
              }`}
            >
              {item.stockActual}
            </span>
            {item.enAlerta && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 mt-1">
                <i className="fa-solid fa-triangle-exclamation text-[8px]" />
                {item.stockActual === 0 ? 'Agotado' : 'Desabasto'}
              </span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-center font-mono text-[#a3a3a3]">
          {item.minimoAlerta}
        </td>
        <td className="py-3 px-4 text-right font-mono text-[#a3a3a3]">
          ${item.costoUnitario.toFixed(2)}
        </td>
        <td className="py-3 px-4 text-right font-mono text-white font-semibold">
          ${item.precioVenta.toFixed(2)}
        </td>
        <td className="py-3 px-4 text-center font-mono">
          <span className={`px-2 py-1 rounded-md text-xs font-bold ${getMargenBadgeClass(item.margenPorcentaje)}`}>
            {item.margenPorcentaje.toFixed(2)}%
          </span>
        </td>
        <td className="py-3 px-4 text-center">
          <button
            onClick={() => handleOpenEdit(item)}
            className="px-2.5 py-1 rounded-lg bg-[#222222] hover:bg-[#333333] text-[#d4d4d4] hover:text-white transition-colors text-xs font-medium"
            title="Editar Costo y Precio de Venta (Criterio 3)"
          >
            <i className="fa-solid fa-pen-to-square text-xs mr-1" /> Editar
          </button>
        </td>
      </tr>
    ));
  };

  const renderEntradasBody = () => {
    if (loadingEntradas) {
      return (
        <tr>
          <td colSpan={5} className="py-8 text-center text-[#737373]">
            Cargando historial de facturas...
          </td>
        </tr>
      );
    }

    if (entradas.length === 0) {
      return (
        <tr>
          <td colSpan={5} className="py-8 text-center text-[#737373]">
            No hay entradas de mercancía registradas aún.
          </td>
        </tr>
      );
    }

    return entradas.map((entrada) => (
      <React.Fragment key={entrada.idFactura}>
        <tr className="hover:bg-[#161616] transition-colors">
          <td className="py-3.5 px-4 font-semibold text-white">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-building text-[#737373] text-xs" />
              <span>{entrada.proveedor}</span>
            </div>
          </td>
          <td className="py-3.5 px-4 font-mono text-[#D81B60] font-bold">
            {entrada.factura}
          </td>
          <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
            ${entrada.totalPagado.toFixed(2)}
          </td>
          <td className="py-3.5 px-4 text-center text-[#a3a3a3] font-mono">
            {new Date(entrada.fechaRegistro).toLocaleDateString('es-MX', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </td>
          <td className="py-3.5 px-4 text-center">
            <button
              onClick={() =>
                setExpandedFacturaId(
                  expandedFacturaId === entrada.idFactura
                    ? null
                    : entrada.idFactura
                )
              }
              className="text-[#a3a3a3] hover:text-white px-2 py-1 rounded bg-[#1c1c1c] text-xs font-medium"
            >
              <i className={`fa-solid ${getExpandIcon(expandedFacturaId === entrada.idFactura)} mr-1`} />
              {getExpandText(expandedFacturaId === entrada.idFactura)}
            </button>
          </td>
        </tr>
        {expandedFacturaId === entrada.idFactura && (
          <tr className="bg-[#0e0e0e]">
            <td colSpan={5} className="p-4">
              <div className="bg-[#141414] rounded-xl p-3 border border-[#222222] space-y-2">
                <span className="text-[11px] font-bold text-[#d4d4d4] uppercase tracking-wider block">
                  Insumos ingresados con folio {entrada.factura}:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {entrada.lineas.map((linea) => (
                    <div
                      key={linea.idEntrada}
                      className="p-2.5 bg-[#1b1b1b] rounded-lg border border-[#2a2a2a] text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {linea.producto}
                        </div>
                        <div className="text-[10px] text-[#888888]">
                          Comprado: {linea.cantidadComprada} unid. | Costo: $
                          {linea.costoUnitario.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded bg-[#D81B60]/10 text-[#D81B60] text-[10px] font-bold border border-[#D81B60]/20">
                          +{linea.cantidadStockAgregada} stock
                        </span>
                        <div className="font-mono text-[11px] text-[#a3a3a3] mt-0.5">
                          Subtotal: ${linea.costoTotal.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    ));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0a0a0a] text-[#f3f4f6] p-6 lg:p-8 space-y-8">
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262626] pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Gestión de Inventario Maestro y Registro de Entradas
          </h1>
          <p className="text-xs text-[#a3a3a3] mt-0.5">
            Control de existencias, recálculo de márgenes de ganancia y recepción de facturas de proveedores.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-[#D81B60] hover:bg-[#c2185b] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#D81B60]/20 transition-all hover:scale-[1.02]"
          >
            <i className="fa-solid fa-truck-ramp-box text-sm" /> Registrar Entrada
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-[#111111] p-4 rounded-2xl border border-[#262626] space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Pills de Categorías Dinámicas del Backend */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {categoriasPills.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleSelectCategoria(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategoria === cat
                    ? 'bg-white text-black shadow-md'
                    : 'bg-[#1a1a1a] text-[#a3a3a3] hover:text-white hover:bg-[#262626]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Buscador Funcional con Submit, Debounce y Botón Limpiar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-96">
            <label htmlFor="search-insumos" className="sr-only">
              Buscar por SKU, Producto o Categoría
            </label>
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] text-xs" />
            <input
              id="search-insumos"
              type="text"
              placeholder="Buscar por SKU, Producto o Categoría..."
              value={busquedaInput}
              onChange={(e) => setBusquedaInput(e.target.value)}
              className="w-full bg-[#171717] border border-[#2a2a2a] rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-[#525252] focus:outline-none focus:border-[#D81B60]"
            />
            {busquedaInput.length > 0 && (
              <button
                type="button"
                onClick={handleClearSearch}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-white p-1"
              >
                <i className="fa-solid fa-xmark text-xs" />
              </button>
            )}
          </form>
        </div>

        {/* Fila 2: Filtros de Estado de Stock (Alertas/Agotados), Ordenamiento y Limpiar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-[#1e1e1e]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-[#737373] font-semibold uppercase tracking-wider mr-1">
              Estado:
            </span>
            <button
              type="button"
              onClick={() => handleSelectEstadoStock('todos')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                estadoStock === 'todos'
                  ? 'bg-[#D81B60] text-white'
                  : 'bg-[#181818] text-[#a3a3a3] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => handleSelectEstadoStock('alerta')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                estadoStock === 'alerta'
                  ? 'bg-amber-500 text-black'
                  : 'bg-[#181818] text-amber-400 hover:bg-amber-950/40 border border-amber-500/20'
              }`}
            >
              <i className="fa-solid fa-triangle-exclamation text-[10px]" />
              <span>En Alerta</span>
              <span className="font-mono text-[10px] opacity-85">({totalEnAlerta})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectEstadoStock('agotado')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                estadoStock === 'agotado'
                  ? 'bg-red-500 text-white'
                  : 'bg-[#181818] text-red-400 hover:bg-red-950/40 border border-red-500/20'
              }`}
            >
              <i className="fa-solid fa-circle-xmark text-[10px]" />
              <span>Agotados</span>
              <span className="font-mono text-[10px] opacity-85">({totalAgotados})</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectEstadoStock('optimo')}
              className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                estadoStock === 'optimo'
                  ? 'bg-emerald-500 text-black'
                  : 'bg-[#181818] text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/20'
              }`}
            >
              <i className="fa-solid fa-circle-check text-[10px]" />
              <span>Stock Óptimo</span>
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="select-orden-inventario" className="text-[11px] text-[#737373] font-semibold uppercase tracking-wider">
              Ordenar:
            </label>
            <select
              id="select-orden-inventario"
              value={ordenarPor}
              onChange={(e) => handleChangeOrden(e.target.value as OrdenInventario)}
              className="bg-[#171717] border border-[#2a2a2a] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D81B60]"
            >
              <option value="categoria_nombre">Categoría y Nombre (A-Z)</option>
              <option value="producto_asc">Producto (A-Z)</option>
              <option value="producto_desc">Producto (Z-A)</option>
              <option value="sku_asc">SKU (Ascendente)</option>
              <option value="stock_asc">Stock: Menor a Mayor</option>
              <option value="stock_desc">Stock: Mayor a Menor</option>
              <option value="margen_asc">Margen (%): Menor a Mayor</option>
              <option value="margen_desc">Margen (%): Mayor a Menor</option>
              <option value="precio_asc">Precio: Menor a Mayor</option>
              <option value="precio_desc">Precio: Mayor a Menor</option>
            </select>

            {hayFiltrosActivos && (
              <button
                type="button"
                onClick={handleResetFiltros}
                className="px-3 py-1.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-[#d4d4d4] hover:text-white text-xs font-medium border border-[#2e2e2e] transition-colors"
              >
                <i className="fa-solid fa-filter-circle-xmark mr-1.5 text-[11px]" />
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: TABLA 1 - INVENTARIO MAESTRO DE INSUMOS (8 COLUMNAS EXACTAS + PAGINACIÓN DE 15) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-boxes-stacked text-[#D81B60]" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Tabla 1: Inventario Maestro de Insumos
            </h2>
          </div>
          <span className="text-xs text-[#737373] font-mono">
            {totalRegistros.toLocaleString('es-MX')} insumos encontrados
          </span>
        </div>

        <div className="bg-[#111111] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#161616] text-[#a3a3a3] uppercase tracking-wider text-[11px] border-b border-[#262626]">
                  <th className="py-3 px-4 font-semibold">1. SKU</th>
                  <th className="py-3 px-4 font-semibold">2. Producto</th>
                  <th className="py-3 px-4 font-semibold">3. Categoría</th>
                  <th className="py-3 px-4 font-semibold text-center">4. Stock Actual</th>
                  <th className="py-3 px-4 font-semibold text-center">5. Mínimo de Alerta</th>
                  <th className="py-3 px-4 font-semibold text-right">6. Costo Unitario</th>
                  <th className="py-3 px-4 font-semibold text-right">7. Precio de Venta</th>
                  <th className="py-3 px-4 font-semibold text-center">8. Margen (%)</th>
                  <th className="py-3 px-4 font-semibold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]">
                {renderInsumosBody()}
              </tbody>
            </table>
          </div>

          {/* Barra de Paginación (15 registros por página) */}
          <div className="bg-[#141414] border-t border-[#262626] px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#a3a3a3] font-mono">
              {formatRangeText(pagina, TAMANO_PAGINA, totalRegistros)}
              <span className="text-[#737373] ml-2">
                (Página {pagina} de {totalPaginas})
              </span>
            </div>

            <nav aria-label="Paginación de inventario" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleChangePagina(1)}
                disabled={pagina <= 1 || loadingInsumos}
                aria-label="Primera página"
                className="px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#2c2c2c] text-xs text-[#d4d4d4] hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-angles-left" />
              </button>
              <button
                type="button"
                onClick={() => handleChangePagina(Math.max(1, pagina - 1))}
                disabled={pagina <= 1 || loadingInsumos}
                aria-label="Página anterior"
                className="px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#2c2c2c] text-xs text-[#d4d4d4] hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-chevron-left" />
              </button>

              {pageTokens.map((token) =>
                typeof token === 'number' ? (
                  <button
                    key={token}
                    type="button"
                    onClick={() => handleChangePagina(token)}
                    disabled={loadingInsumos}
                    aria-label={`Página ${token}`}
                    aria-current={token === pagina ? 'page' : undefined}
                    className={`min-w-[32px] px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                      token === pagina
                        ? 'bg-[#D81B60] text-white shadow-sm'
                        : 'bg-[#1c1c1c] border border-[#2c2c2c] text-[#a3a3a3] hover:text-white hover:bg-[#262626]'
                    }`}
                  >
                    {token}
                  </button>
                ) : (
                  <span key={token} className="px-1.5 text-xs text-[#737373] select-none">
                    ...
                  </span>
                )
              )}

              <button
                type="button"
                onClick={() => handleChangePagina(Math.min(totalPaginas, pagina + 1))}
                disabled={pagina >= totalPaginas || loadingInsumos}
                aria-label="Página siguiente"
                className="px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#2c2c2c] text-xs text-[#d4d4d4] hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-chevron-right" />
              </button>
              <button
                type="button"
                onClick={() => handleChangePagina(totalPaginas)}
                disabled={pagina >= totalPaginas || loadingInsumos}
                aria-label="Última página"
                className="px-2.5 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#2c2c2c] text-xs text-[#d4d4d4] hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <i className="fa-solid fa-angles-right" />
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: TABLA 2 - HISTORIAL DE ENTRADAS DE MERCANCÍA */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-receipt text-[#D81B60]" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Tabla 2: Historial de Entradas de Mercancía
            </h2>
          </div>
          <span className="text-xs text-[#737373] font-mono">
            {entradas.length} facturas consultadas
          </span>
        </div>

        <div className="bg-[#111111] border border-[#262626] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#161616] text-[#a3a3a3] uppercase tracking-wider text-[11px] border-b border-[#262626]">
                  <th className="py-3 px-4 font-semibold">1. Proveedor</th>
                  <th className="py-3 px-4 font-semibold">2. Factura</th>
                  <th className="py-3 px-4 font-semibold text-right">3. Total Pagado</th>
                  <th className="py-3 px-4 font-semibold text-center">Fecha de Entrada</th>
                  <th className="py-3 px-4 font-semibold text-center">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#202020]">
                {renderEntradasBody()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE PRECIOS Y COSTOS (CRITERIO 3) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-md p-6 shadow-2xl text-[#f3f4f6] space-y-5">
            <div className="flex items-center justify-between border-b border-[#262626] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Editar Precios y Costos
                </h3>
                <p className="text-xs text-[#a3a3a3]">{editingItem.producto} ({editingItem.sku})</p>
              </div>
              <button
                onClick={handleCloseEdit}
                className="text-[#737373] hover:text-white p-1"
                aria-label="Cerrar modal de edición"
              >
                <i className="fa-solid fa-xmark text-base" />
              </button>
            </div>

            {editError && (
              <div
                role="alert"
                className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-start gap-2"
              >
                <i className="fa-solid fa-circle-exclamation text-red-400 mt-0.5 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarPrecios} className="space-y-4">
              <div>
                <label
                  htmlFor="input-edit-costo"
                  className="block text-xs font-semibold text-[#d4d4d4] mb-1"
                >
                  6. Costo Unitario ($)
                </label>
                <input
                  id="input-edit-costo"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCosto}
                  onChange={(e) => setEditCosto(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#2c2c2c] rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#D81B60]"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="input-edit-precio"
                  className="block text-xs font-semibold text-[#d4d4d4] mb-1"
                >
                  7. Precio de Venta ($)
                </label>
                <input
                  id="input-edit-precio"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrecio}
                  onChange={(e) => setEditPrecio(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#2c2c2c] rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#D81B60]"
                  required
                />
              </div>

              {/* Recálculo instantáneo Criterio 3 */}
              <div className="bg-[#1b1b1b] p-3 rounded-xl border border-[#2a2a2a] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#a3a3a3]">
                  8. Margen Recalculado:
                </span>
                <span className={`font-mono text-sm font-bold ${getPreviewMargenClass(previewMargen)}`}>
                  {previewMargen.toFixed(2)}%
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#262626]">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={savingPrices}
                  className="px-4 py-2 rounded-xl border border-[#333333] text-xs text-[#a3a3a3] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPrices}
                  className="px-4 py-2 rounded-xl bg-[#D81B60] hover:bg-[#c2185b] text-xs font-bold text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPrices ? 'Guardando...' : 'Guardar y Recalcular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Entrada */}
      <RegistrarEntradaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccessEntrada}
        insumosDisponibles={catalogoInsumos.length > 0 ? catalogoInsumos : insumos}
      />
    </div>
  );
}

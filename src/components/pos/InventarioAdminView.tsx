'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { InsumoInventarioDto, EntradaHistorialDto } from '@/types/inventario';
import { inventarioService } from '@/services/inventarioService';
import RegistrarEntradaModal from './RegistrarEntradaModal';

export default function InventarioAdminView() {
  const [insumos, setInsumos] = useState<InsumoInventarioDto[]>([]);
  const [entradas, setEntradas] = useState<EntradaHistorialDto[]>([]);
  const [selectedCategoria, setSelectedCategoria] = useState<string>('Todas');
  const [busqueda, setBusqueda] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InsumoInventarioDto | null>(null);
  const [editCosto, setEditCosto] = useState<string>('');
  const [editPrecio, setEditPrecio] = useState<string>('');
  const [savingPrices, setSavingPrices] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [expandedFacturaId, setExpandedFacturaId] = useState<number | null>(null);

  const categorias = ['Todas', 'Snacks', 'Bebidas', 'Dulces', 'Comida'];

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [insumosData, entradasData] = await Promise.all([
        inventarioService.getInsumos({
          categoria: selectedCategoria !== 'Todas' ? selectedCategoria : undefined,
          busqueda: busqueda.trim() ? busqueda.trim() : undefined,
        }),
        inventarioService.getHistorialEntradas(20),
      ]);
      setInsumos(insumosData);
      setEntradas(entradasData);
    } catch (err) {
      console.error('Error al cargar datos del inventario:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoria, busqueda]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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

  const handleGuardarPrecios = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const costoNum = parseFloat(editCosto);
    const precioNum = parseFloat(editPrecio);

    if (isNaN(costoNum) || costoNum < 0) {
      setEditError('El costo unitario debe ser un número mayor o igual a 0.');
      return;
    }

    if (isNaN(precioNum) || precioNum < 0) {
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

      // Actualizar estado local con el cálculo de margen devuelto por el backend (Criterio 3)
      setInsumos((prev) =>
        prev.map((item) => (item.idProducto === updated.idProducto ? updated : item))
      );
      handleCloseEdit();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al actualizar precios';
      setEditError(msg);
    } finally {
      setSavingPrices(false);
    }
  };

  // Preview dinámico del margen en el modal de edición
  const previewCosto = parseFloat(editCosto) || 0;
  const previewPrecio = parseFloat(editPrecio) || 0;
  let previewMargen = 0;
  if (previewPrecio > 0) {
    previewMargen = Number((((previewPrecio - previewCosto) / previewPrecio) * 100).toFixed(2));
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#0a0a0a] text-[#f3f4f6] p-6 lg:p-8 space-y-8">
      {/* Encabezado y Acción Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#262626] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase bg-[#D81B60]/10 text-[#D81B60] border border-[#D81B60]/30">
              HU-11 Módulo Administrativo
            </span>
            <span className="text-xs text-[#a3a3a3]">Sprint 2 • Nov 05, 2026</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
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
      <div className="bg-[#111111] p-4 rounded-2xl border border-[#262626] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Pills de Categorías Preexistentes */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategoria(cat)}
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

        {/* Buscador de Insumos */}
        <div className="relative w-full md:w-80">
          <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] text-xs" />
          <input
            type="text"
            placeholder="Buscar por SKU o Producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#171717] border border-[#2a2a2a] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-[#525252] focus:outline-none focus:border-[#D81B60]"
          />
        </div>
      </div>

      {/* SECCIÓN 1: TABLA 1 - INVENTARIO MAESTRO DE INSUMOS (8 COLUMNAS EXACTAS) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-boxes-stacked text-[#D81B60]" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Tabla 1: Inventario Maestro de Insumos
            </h2>
          </div>
          <span className="text-xs text-[#737373] font-mono">
            {insumos.length} insumos registrados
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
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#737373]">
                      <i className="fa-solid fa-spinner fa-spin text-xl text-[#D81B60] mb-2" />
                      <p>Cargando inventario maestro...</p>
                    </td>
                  </tr>
                ) : insumos.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-10 text-center text-[#737373]">
                      No se encontraron insumos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  insumos.map((item) => (
                    <tr
                      key={item.idProducto}
                      className={`transition-colors ${
                        item.enAlerta
                          ? 'bg-amber-950/20 hover:bg-amber-950/30 border-l-4 border-l-amber-500'
                          : 'hover:bg-[#161616]'
                      }`}
                    >
                      {/* 1. SKU */}
                      <td className="py-3 px-4 font-mono text-[#d4d4d4] font-semibold">
                        {item.sku}
                      </td>

                      {/* 2. Producto */}
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

                      {/* 3. Categoría */}
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#222222] text-[#d4d4d4] border border-[#333333]">
                          {item.categoria}
                        </span>
                      </td>

                      {/* 4. Stock Actual con Alerta Criterio 1 */}
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
                              <i className="fa-solid fa-triangle-exclamation text-[8px]" /> Desabasto
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Mínimo de Alerta */}
                      <td className="py-3 px-4 text-center font-mono text-[#a3a3a3]">
                        {item.minimoAlerta}
                      </td>

                      {/* 6. Costo Unitario */}
                      <td className="py-3 px-4 text-right font-mono text-[#a3a3a3]">
                        ${item.costoUnitario.toFixed(2)}
                      </td>

                      {/* 7. Precio de Venta */}
                      <td className="py-3 px-4 text-right font-mono text-white font-semibold">
                        ${item.precioVenta.toFixed(2)}
                      </td>

                      {/* 8. Margen (%) Recalculado */}
                      <td className="py-3 px-4 text-center font-mono">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold ${
                            item.margenPorcentaje >= 60
                              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                              : item.margenPorcentaje >= 30
                              ? 'bg-blue-950/40 text-blue-400 border border-blue-500/30'
                              : 'bg-red-950/40 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {item.margenPorcentaje.toFixed(2)}%
                        </span>
                      </td>

                      {/* Acciones (Criterio 3: Editar Precios) */}
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
                  ))
                )}
              </tbody>
            </table>
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
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#737373]">
                      Cargando historial de facturas...
                    </td>
                  </tr>
                ) : entradas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-[#737373]">
                      No hay entradas de mercancía registradas aún.
                    </td>
                  </tr>
                ) : (
                  entradas.map((entrada) => (
                    <React.Fragment key={entrada.idFactura}>
                      <tr className="hover:bg-[#161616] transition-colors">
                        {/* 1. Proveedor */}
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <i className="fa-solid fa-building text-[#737373] text-xs" />
                            <span>{entrada.proveedor}</span>
                          </div>
                        </td>

                        {/* 2. Factura */}
                        <td className="py-3.5 px-4 font-mono text-[#D81B60] font-bold">
                          {entrada.factura}
                        </td>

                        {/* 3. Total Pagado */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-white text-sm">
                          ${entrada.totalPagado.toFixed(2)}
                        </td>

                        {/* Fecha */}
                        <td className="py-3.5 px-4 text-center text-[#a3a3a3] font-mono">
                          {new Date(entrada.fechaRegistro).toLocaleDateString('es-MX', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Toggle detalles */}
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
                            <i
                              className={`fa-solid ${
                                expandedFacturaId === entrada.idFactura
                                  ? 'fa-chevron-up'
                                  : 'fa-chevron-down'
                              } mr-1`}
                            />
                            {expandedFacturaId === entrada.idFactura ? 'Ocultar' : 'Ver líneas'}
                          </button>
                        </td>
                      </tr>

                      {/* Fila expandible con las líneas de entrada de la factura */}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL DE EDICIÓN DE PRECIOS Y COSTOS (CRITERIO 3) */}
      {editingItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
        >
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
                <label className="block text-xs font-semibold text-[#d4d4d4] mb-1">
                  6. Costo Unitario ($)
                </label>
                <input
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
                <label className="block text-xs font-semibold text-[#d4d4d4] mb-1">
                  7. Precio de Venta ($)
                </label>
                <input
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
                <span
                  className={`font-mono text-sm font-bold ${
                    previewMargen >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
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
        onSuccess={cargarDatos}
        insumosDisponibles={insumos}
      />
    </div>
  );
}

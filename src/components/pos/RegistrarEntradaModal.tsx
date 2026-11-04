'use client';

import React, { useState, useEffect } from 'react';
import {
  InsumoInventarioDto,
  ProveedorDto,
  RegistrarEntradaDto,
} from '@/types/inventario';
import { inventarioService } from '@/services/inventarioService';

interface RegistrarEntradaModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSuccess: () => void;
  readonly insumosDisponibles: readonly InsumoInventarioDto[];
}

interface FormLinea {
  readonly keyId: string;
  idProducto: number;
  cantidad: number;
  costoUnitario: number;
}

function generarKeyId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function validarLineas(
  lineas: readonly FormLinea[],
  insumosDisponibles: readonly InsumoInventarioDto[]
): string | null {
  for (const linea of lineas) {
    if (!linea.idProducto) {
      return 'Seleccione un insumo válido para cada línea.';
    }
    if (linea.cantidad <= 0) {
      return 'La cantidad debe ser mayor a 0 en todas las líneas.';
    }
    if (linea.costoUnitario < 0) {
      return 'El costo unitario no puede ser negativo.';
    }

    const prod = insumosDisponibles.find((p) => p.idProducto === linea.idProducto);
    if (prod && linea.costoUnitario > prod.precioVenta) {
      return `El costo ($${linea.costoUnitario.toFixed(2)}) de '${prod.producto}' excede su precio de venta ($${prod.precioVenta.toFixed(2)}). Regla de protección de margen negativo.`;
    }
  }
  return null;
}

function validarCamposFactura(
  selectedProveedor: number | '',
  folioFactura: string,
  totalPagado: string,
  totalCalculado: number
): { error: string | null; totalNum: number } {
  if (!selectedProveedor) {
    return { error: 'Seleccione un proveedor.', totalNum: 0 };
  }
  if (!folioFactura.trim()) {
    return { error: 'Ingrese el folio de la factura.', totalNum: 0 };
  }

  const totalNum = Number.parseFloat(totalPagado);
  if (Number.isNaN(totalNum) || totalNum <= 0) {
    return { error: 'Ingrese un total pagado válido mayor a 0.', totalNum: 0 };
  }
  if (Math.abs(totalNum - totalCalculado) > 0.01) {
    return {
      error: `El total pagado ($${totalNum.toFixed(2)}) no coincide con la suma calculada de las líneas ($${totalCalculado.toFixed(2)}).`,
      totalNum: 0,
    };
  }
  return { error: null, totalNum };
}

export default function RegistrarEntradaModal({
  isOpen,
  onClose,
  onSuccess,
  insumosDisponibles,
}: RegistrarEntradaModalProps) {
  const [proveedores, setProveedores] = useState<ProveedorDto[]>([]);
  const [selectedProveedor, setSelectedProveedor] = useState<number | ''>('');
  const [folioFactura, setFolioFactura] = useState<string>('');
  const [totalPagado, setTotalPagado] = useState<string>('');
  const [lineas, setLineas] = useState<FormLinea[]>([
    {
      keyId: 'initial-line',
      idProducto: insumosDisponibles[0]?.idProducto || 0,
      cantidad: 1,
      costoUnitario: insumosDisponibles[0]?.costoUnitario || 0,
    },
  ]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCloseModal = () => {
    setErrorMessage(null);
    setFolioFactura('');
    setTotalPagado('');
    setLineas([
      {
        keyId: generarKeyId(),
        idProducto: insumosDisponibles[0]?.idProducto || 0,
        cantidad: 1,
        costoUnitario: insumosDisponibles[0]?.costoUnitario || 0,
      },
    ]);
    onClose();
  };

  // Cargar lista de proveedores al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    inventarioService
      .getProveedores()
      .then((res) => {
        if (isMounted) {
          setProveedores(res);
          if (res.length > 0) {
            setSelectedProveedor(res[0].idProveedor);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error al cargar proveedores:', err);
          setErrorMessage('No se pudo cargar la lista de proveedores.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalCalculado = lineas.reduce(
    (acc, l) => acc + (l.cantidad || 0) * (l.costoUnitario || 0),
    0
  );

  const handleAddLinea = () => {
    const firstId = insumosDisponibles[0]?.idProducto || 0;
    const defaultCost = insumosDisponibles[0]?.costoUnitario || 0;
    setLineas([
      ...lineas,
      { keyId: generarKeyId(), idProducto: firstId, cantidad: 1, costoUnitario: defaultCost },
    ]);
  };

  const handleRemoveLinea = (keyId: string) => {
    if (lineas.length === 1) {
      setErrorMessage('La factura debe tener al menos una línea de insumo.');
      return;
    }
    setLineas(lineas.filter((l) => l.keyId !== keyId));
  };

  const handleLineaChange = (
    keyId: string,
    field: 'idProducto' | 'cantidad' | 'costoUnitario',
    value: number
  ) => {
    const updated = lineas.map((item) => {
      if (item.keyId !== keyId) return item;
      if (field === 'idProducto') {
        const selectedProd = insumosDisponibles.find((p) => p.idProducto === value);
        return {
          ...item,
          idProducto: value,
          costoUnitario: selectedProd ? selectedProd.costoUnitario : item.costoUnitario,
        };
      }
      return { ...item, [field]: value };
    });
    setLineas(updated);
  };

  const handleAutoFillTotal = () => {
    setTotalPagado(totalCalculado.toFixed(2));
  };

  const handleSubmit = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const validacionFactura = validarCamposFactura(
      selectedProveedor,
      folioFactura,
      totalPagado,
      totalCalculado
    );
    if (validacionFactura.error) {
      setErrorMessage(validacionFactura.error);
      return;
    }

    const errorLineas = validarLineas(lineas, insumosDisponibles);
    if (errorLineas) {
      setErrorMessage(errorLineas);
      return;
    }

    setLoading(true);
    try {
      const payload: RegistrarEntradaDto = {
        idProveedor: Number(selectedProveedor),
        folioFactura: folioFactura.trim(),
        totalPagado: validacionFactura.totalNum,
        lineas: lineas.map((l) => ({
          idProducto: l.idProducto,
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
        })),
      };

      await inventarioService.registrarEntrada(payload);
      handleCloseModal();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrar la entrada';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#f3f4f6]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#262626] flex items-center justify-between bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D81B60]/10 border border-[#D81B60]/30 flex items-center justify-center text-[#D81B60]">
              <i className="fa-solid fa-truck-ramp-box text-lg" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Registrar Entrada de Mercancía
              </h2>
              <p className="text-xs text-[#a3a3a3]">
                Captura de facturas de proveedores para incrementar existencias (HU-11)
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="text-[#737373] hover:text-white p-2 rounded-lg hover:bg-[#262626] transition-colors"
            aria-label="Cerrar modal"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl text-red-300 text-xs flex items-start gap-2.5"
            >
              <i className="fa-solid fa-circle-exclamation mt-0.5 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Encabezado de Factura */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="select-proveedor"
                className="block text-xs font-semibold text-[#d4d4d4] mb-1.5 uppercase tracking-wider"
              >
                Proveedor *
              </label>
              <select
                id="select-proveedor"
                value={selectedProveedor}
                onChange={(e) => setSelectedProveedor(Number(e.target.value))}
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#D81B60]"
                required
              >
                {proveedores.map((p) => (
                  <option key={p.idProveedor} value={p.idProveedor}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="input-folio-factura"
                className="block text-xs font-semibold text-[#d4d4d4] mb-1.5 uppercase tracking-wider"
              >
                Folio de Factura *
              </label>
              <input
                id="input-folio-factura"
                type="text"
                placeholder="ej. F-9021"
                value={folioFactura}
                onChange={(e) => setFolioFactura(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-[#525252] focus:outline-none focus:border-[#D81B60]"
                required
              />
            </div>
          </div>

          {/* Tabla de Insumos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#d4d4d4] uppercase tracking-wider">
                Líneas de Mercancía Recibida
              </span>
              <button
                type="button"
                onClick={handleAddLinea}
                className="text-xs text-[#D81B60] hover:text-[#f06292] font-semibold flex items-center gap-1.5"
              >
                <i className="fa-solid fa-plus" /> Agregar Insumo
              </button>
            </div>

            <div className="space-y-3">
              {lineas.map((linea) => {
                const prod = insumosDisponibles.find((p) => p.idProducto === linea.idProducto);
                const subtotal = (linea.cantidad || 0) * (linea.costoUnitario || 0);
                const factor = prod?.factorEquivalencia || 1;
                const totalStockSumado = (linea.cantidad || 0) * factor;

                return (
                  <div
                    key={linea.keyId}
                    className="p-3.5 bg-[#181818] border border-[#262626] rounded-xl space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <label htmlFor={`prod-${linea.keyId}`} className="sr-only">
                          Insumo
                        </label>
                        <select
                          id={`prod-${linea.keyId}`}
                          value={linea.idProducto}
                          onChange={(e) =>
                            handleLineaChange(linea.keyId, 'idProducto', Number(e.target.value))
                          }
                          className="w-full bg-[#202020] border border-[#333333] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D81B60]"
                        >
                          {insumosDisponibles.map((p) => (
                            <option key={p.idProducto} value={p.idProducto}>
                              {p.sku} - {p.producto} ({p.categoria})
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLinea(linea.keyId)}
                        className="text-[#737373] hover:text-red-400 p-1.5 transition-colors"
                        title="Eliminar línea"
                      >
                        <i className="fa-solid fa-trash-can text-sm" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label
                          htmlFor={`cant-${linea.keyId}`}
                          className="text-[10px] text-[#888888] block mb-1"
                        >
                          Cantidad (Factura)
                        </label>
                        <input
                          id={`cant-${linea.keyId}`}
                          type="number"
                          min="1"
                          value={linea.cantidad}
                          onChange={(e) =>
                            handleLineaChange(
                              linea.keyId,
                              'cantidad',
                              Math.max(1, Number.parseInt(e.target.value, 10) || 1)
                            )
                          }
                          className="w-full bg-[#202020] border border-[#333333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D81B60]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={`costo-${linea.keyId}`}
                          className="text-[10px] text-[#888888] block mb-1"
                        >
                          Costo Unitario ($)
                        </label>
                        <input
                          id={`costo-${linea.keyId}`}
                          type="number"
                          step="0.01"
                          min="0"
                          value={linea.costoUnitario}
                          onChange={(e) =>
                            handleLineaChange(
                              linea.keyId,
                              'costoUnitario',
                              Number.parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full bg-[#202020] border border-[#333333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#D81B60]"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] text-[#888888] block mb-1">Subtotal</span>
                        <div className="bg-[#121212] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-right">
                          ${subtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {factor > 1 && (
                      <div className="text-[11px] text-amber-400/90 flex items-center gap-1.5 pt-1">
                        <i className="fa-solid fa-arrows-split-up-and-left text-[10px]" />
                        <span>
                          <strong>Stock Fraccionado (Regla 1):</strong> Multiplica por {factor} ({linea.cantidad} × {factor} = <strong>+{totalStockSumado}</strong> unidades en POS).
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Total Pagado */}
          <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#262626] flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-[#a3a3a3]">
              <div>Total de líneas calculado: <strong className="text-white">${totalCalculado.toFixed(2)}</strong></div>
              <button
                type="button"
                onClick={handleAutoFillTotal}
                className="text-[11px] text-[#D81B60] hover:underline mt-1 font-semibold block"
              >
                Igualar total pagado a la suma
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <label
                htmlFor="input-total-pagado"
                className="text-xs font-semibold uppercase text-[#d4d4d4]"
              >
                Total Pagado ($):
              </label>
              <input
                id="input-total-pagado"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={totalPagado}
                onChange={(e) => setTotalPagado(e.target.value)}
                className="bg-[#242424] border border-[#383838] rounded-xl px-3 py-2 text-sm text-white font-mono text-right w-36 focus:outline-none focus:border-[#D81B60]"
                required
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#262626]">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#333333] text-sm text-[#a3a3a3] hover:text-white hover:bg-[#202020] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#D81B60] hover:bg-[#c2185b] text-sm text-white font-semibold flex items-center gap-2 shadow-lg shadow-[#D81B60]/20 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" /> Registrando...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check" /> Confirmar Entrada
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

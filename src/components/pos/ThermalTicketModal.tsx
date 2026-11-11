'use client';

import React from 'react';
import { VentaConfirmadaDto } from '@/types/api';

interface TicketItemInput {
  nombre: string;
  cantidad: number;
  precio: number;
  asientos?: string[];
  nombreSala?: string | null;
}

interface ThermalTicketModalProps {
  ticket?: VentaConfirmadaDto | null;
  isOpen?: boolean;
  folio?: string;
  items?: TicketItemInput[];
  total?: number;
  metodoPago?: string;
  montoRecibido?: number;
  cambio?: number;
  folioAutorizacion?: string | null;
  rfcCine?: string;
  codigoBarrasTicket?: string;
  codigoPreordenCanjeada?: string | null;
  fechaVenta?: string;
  onNewSale?: () => void;
  onClose?: () => void;
}

const BARCODE_WIDTHS = [
  3, 1, 2, 1, 4, 1, 1, 2, 3, 1, 2, 1, 3, 2, 1, 1, 4, 1, 2, 1, 3, 1, 1, 2, 3, 1, 2, 2, 1, 3,
];

function formatTicketDate(fechaRaw?: string): string {
  if (!fechaRaw) {
    return new Date().toLocaleString('es-MX');
  }
  const parsed = new Date(fechaRaw);
  if (Number.isNaN(parsed.getTime())) {
    return fechaRaw;
  }
  return parsed.toLocaleString('es-MX');
}

export default function ThermalTicketModal({
  ticket,
  isOpen,
  folio,
  items,
  total,
  metodoPago,
  montoRecibido,
  cambio,
  folioAutorizacion,
  rfcCine,
  codigoBarrasTicket,
  codigoPreordenCanjeada,
  fechaVenta,
  onNewSale,
  onClose,
}: Readonly<ThermalTicketModalProps>) {
  const visible = isOpen !== undefined ? isOpen : Boolean(ticket);
  if (!visible) return null;

  const folioFinal = ticket?.folio || folio || 'VT-0001';
  const totalFinal = ticket?.total ?? total ?? 0;
  const metodoFinal = ticket?.metodoPago || metodoPago || 'Efectivo';
  const rfcFinal = ticket?.rfcCine || rfcCine || 'CTX-260414-9X0';
  const codigoBarrasFinal = ticket?.codigoBarrasTicket || codigoBarrasTicket || '7501092840192';
  const recibidoFinal = ticket?.montoRecibido ?? montoRecibido ?? totalFinal;
  const cambioFinal = ticket?.cambio ?? cambio ?? Math.max(0, recibidoFinal - totalFinal);
  const voucherFinal = ticket?.folioAutorizacion ?? folioAutorizacion ?? null;
  const preordenCanjeadaFinal = ticket?.codigoPreordenCanjeada ?? codigoPreordenCanjeada ?? null;
  const itemsFinal: TicketItemInput[] = ticket?.items || items || [];
  const fechaFormateada = formatTicketDate(ticket?.fechaVenta || fechaVenta);
  const esEfectivo = metodoFinal.toLowerCase().includes('efectivo');
  const handleCloseAction = onNewSale || onClose || (() => {});

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="flex flex-col items-center">
        {/* Papel térmico blanco con bordes dentados superior e inferior (Mockup 14) */}
        <div className="relative w-[330px] bg-white px-6 py-6 font-mono text-black shadow-[0_20px_50px_rgba(0,0,0,0.85)]">
          {/* Borde dentado superior */}
          <div
            aria-hidden="true"
            className="
              absolute -top-2.5 left-0 right-0 h-2.5
              bg-[radial-gradient(circle,transparent_50%,#ffffff_52%)]
              bg-[length:14px_14px]
            "
          />

          {/* Encabezado Fiscal */}
          <div className="border-b border-dashed border-gray-400 pb-3 text-center">
            <h3 className="text-[15px] font-black tracking-wider text-black">
              CINE TEATRO XILOTZIN
            </h3>
            <p className="mt-0.5 text-[10px] font-bold uppercase text-gray-700">
              JILOTEPEC, ESTADO DE MÉXICO
            </p>
            <p className="text-[9.5px] font-semibold text-gray-600">
              RFC: {rfcFinal} • TEL: (55) 1234 5678
            </p>
          </div>

          {/* Datos del Folio y Fecha/Hora */}
          <div className="border-b border-dashed border-gray-400 py-2.5 text-center text-[11px]">
            <p className="font-black uppercase tracking-wide text-black">
              TICKET DE VENTA OFICIAL
            </p>
            <p className="mt-0.5 font-extrabold text-black">FOLIO: {folioFinal}</p>
            <p className="text-[10px] text-gray-600">{fechaFormateada}</p>
            {preordenCanjeadaFinal && (
              <p className="mt-0.5 text-[9.5px] font-bold text-gray-700">
                CANJE PRE-ORDEN: {preordenCanjeadaFinal}
              </p>
            )}
          </div>

          {/* Desglose de Productos y Boletos */}
          <div className="max-h-56 space-y-2 overflow-y-auto border-b-2 border-black py-3 text-[11px]">
            {itemsFinal.map((item, idx) => {
              const subtotalLinea = item.precio * item.cantidad;
              const salaTexto = item.nombreSala || 'SALA 1';
              return (
                <div key={`${item.nombre}-${idx}`} className="leading-tight">
                  <div className="flex justify-between font-bold text-black">
                    <span className="pr-2">
                      {item.cantidad}x {item.nombre}
                    </span>
                    <span className="shrink-0">${subtotalLinea.toFixed(2)}</span>
                  </div>
                  {item.asientos && item.asientos.length > 0 && (
                    <div className="mt-0.5 pl-2 text-[9.5px] font-extrabold uppercase text-gray-700">
                      ↳ {salaTexto} • BUTACAS: {item.asientos.join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totales y Método de Pago */}
          <div className="border-b border-dashed border-gray-400 py-2.5 text-[11px]">
            <div className="flex items-baseline justify-between text-[13px] font-black text-black">
              <span>TOTAL:</span>
              <span>${totalFinal.toFixed(2)} MXN</span>
            </div>
            <div className="mt-1 flex justify-between text-[10px] font-bold text-gray-700">
              <span>MÉTODO:</span>
              <span>{metodoFinal}</span>
            </div>
            {esEfectivo && (
              <div className="mt-0.5 flex justify-between text-[10px] font-bold text-gray-700">
                <span>RECIBIDO / CAMBIO:</span>
                <span>
                  ${recibidoFinal.toFixed(0)} / ${cambioFinal.toFixed(2)}
                </span>
              </div>
            )}
            {!esEfectivo && voucherFinal && (
              <div className="mt-0.5 flex justify-between text-[10px] font-bold text-gray-700">
                <span>VOUCHER / AUT.:</span>
                <span>{voucherFinal}</span>
              </div>
            )}
          </div>

          {/* Código de barras visual + numérico (Mockup 14) */}
          <div className="flex flex-col items-center py-3 text-center">
            <div
              aria-label="Código de barras del ticket"
              className="flex h-10 items-stretch justify-center gap-[2px] px-2"
            >
              {BARCODE_WIDTHS.map((w, i) => (
                <span
                  key={`bar-${w}-${i}`}
                  style={{ width: `${w}px` }}
                  className="inline-block h-full bg-black"
                />
              ))}
            </div>
            <span className="mt-1 text-[9.5px] font-bold tracking-[0.22em] text-gray-700">
              {codigoBarrasFinal}
            </span>
          </div>

          {/* Pie de ticket */}
          <div className="pt-1 text-center text-[9.5px] leading-tight text-gray-600">
            <p className="font-black text-black">¡GRACIAS POR SU PREFERENCIA!</p>
            <p className="mt-0.5 font-semibold">
              CONSERVE ESTE COMPROBANTE PARA ACCESO A SALA
            </p>
            <p className="mt-1 text-[8.5px] font-bold tracking-widest text-gray-400">
              XILOTZIN POS • RODNIX
            </p>
          </div>

          {/* Borde dentado inferior */}
          <div
            aria-hidden="true"
            className="
              absolute -bottom-2.5 left-0 right-0 h-2.5
              bg-[radial-gradient(circle,transparent_50%,#ffffff_52%)]
              bg-[length:14px_14px]
            "
          />
        </div>

        {/* Botones inferiores: IMPRIMIR y NUEVA VENTA */}
        <div className="mt-5 flex w-[330px] gap-2.5">
          <button
            type="button"
            onClick={() => globalThis.print()}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-[#1F1F1F] py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-[#2C2C2C]"
          >
            <i className="fa-solid fa-print" />
            IMPRIMIR
          </button>
          <button
            type="button"
            onClick={handleCloseAction}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#F57C00] py-3 text-xs font-extrabold uppercase tracking-wider text-white shadow-[0_6px_18px_rgba(245,124,0,0.4)] transition hover:bg-[#FB8C00]"
          >
            <i className="fa-solid fa-rotate-right" />
            NUEVA VENTA
          </button>
        </div>
      </div>
    </div>
  );
}

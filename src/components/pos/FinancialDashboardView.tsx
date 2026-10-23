'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { dashboardService } from '@/services/dashboardService';
import { DashboardFinancieroDto } from '@/types/api';

function getTransactionBadgeStyle(tipoTransaccion: string): string {
  if (tipoTransaccion === 'Taquilla') {
    return 'bg-[#D81B60]/20 text-pink-300 border border-[#D81B60]/40';
  }
  if (tipoTransaccion === 'Dulcería') {
    return 'bg-[#F57C00]/20 text-amber-300 border border-[#F57C00]/40';
  }
  return 'bg-purple-950/40 text-purple-300 border border-purple-800/40';
}

export default function FinancialDashboardView() {
  const [data, setData] = useState<DashboardFinancieroDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modo de filtro: 'semana' (Semana Cinematográfica) o 'personalizado' (Rango de fechas)
  const [modoFiltro, setModoFiltro] = useState<'semana' | 'personalizado'>('semana');
  const [offsetSemanas, setOffsetSemanas] = useState<number>(0);
  const [fechaInicioCustom, setFechaInicioCustom] = useState<string>('');
  const [fechaFinCustom, setFechaFinCustom] = useState<string>('');

  // Filtros locales sobre la tabla de transacciones
  const [filtroTexto, setFiltroTexto] = useState<string>('');
  const [filtroMetodo, setFiltroMetodo] = useState<string>('todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const params = modoFiltro === 'semana'
        ? { offsetSemanas }
        : { fechaInicio: fechaInicioCustom, fechaFin: fechaFinCustom };

      const res = await dashboardService.getResumen(params);
      setData(res);
    } catch {
      setErrorMessage('No se pudieron cargar los datos financieros desde el servidor.');
    } finally {
      setLoading(false);
    }
  }, [modoFiltro, offsetSemanas, fechaInicioCustom, fechaFinCustom]);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  // Criterio 3: Exportar Excel / CSV sin bloquear la interfaz
  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const params = modoFiltro === 'semana'
        ? { offsetSemanas }
        : { fechaInicio: fechaInicioCustom, fechaFin: fechaFinCustom };

      const blob = await dashboardService.exportarTransaccionesCsv(params);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `reporte_financiero_xilotzin_${stamp}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Error al generar y descargar el reporte CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  // Filtrado reactivo de transacciones para la tabla
  const transaccionesFiltradas = useMemo(() => {
    if (!data?.transacciones) return [];

    return data.transacciones.filter((t) => {
      const matchTexto =
        !filtroTexto.trim() ||
        `VT-${t.idVenta}`.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        t.cajero.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        t.resumenDetalle.toLowerCase().includes(filtroTexto.toLowerCase());

      const matchMetodo =
        filtroMetodo === 'todos' ||
        t.metodoPago.toLowerCase().includes(filtroMetodo.toLowerCase());

      const matchTipo =
        filtroTipo === 'todos' ||
        t.tipoTransaccion.toLowerCase() === filtroTipo.toLowerCase();

      return matchTexto && matchMetodo && matchTipo;
    });
  }, [data?.transacciones, filtroTexto, filtroMetodo, filtroTipo]);

  const kpis = data?.kpis;
  const periodo = data?.periodo;

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* Barra de Encabezado y Selector de Semana Cinematográfica */}
      <div className="bg-[#111111] border border-[#262626] rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              <i className="fa-solid fa-chart-pie" />
              <span>Módulo Administrativo • Finanzas</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-black uppercase text-white tracking-wide flex items-center gap-2.5">
              <i className="fa-solid fa-file-invoice-dollar text-[#D81B60]" />
              <span>Dashboard Financiero y Cortes de Caja</span>
            </h2>
            <p className="text-xs text-[#a3a3a3] mt-1 font-mono">
              {periodo?.descripcionSemana || 'Calculando periodo cinematográfico...'}
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => void handleExportCsv()}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg cursor-pointer"
            >
              {isExporting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin text-sm" />
                  <span>Exportando...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-file-excel text-sm" />
                  <span>Exportar Excel / CSV</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => void fetchDashboard()}
              className="bg-[#050505] hover:bg-neutral-800 text-[#a3a3a3] hover:text-white border border-[#262626] px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
              title="Refrescar datos"
            >
              <i className={`fa-solid fa-rotate ${loading ? 'fa-spin text-[#D81B60]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Selector de Semana Cinematográfica (Jueves a Miércoles) */}
        <div className="border-t border-[#262626] pt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#a3a3a3] uppercase tracking-wider flex items-center gap-1.5">
              <i className="fa-solid fa-calendar-days text-[#F57C00]" />
              <span>Filtrar por:</span>
            </span>
            <div className="bg-[#050505] p-1 rounded-xl border border-[#262626] flex gap-1">
              <button
                type="button"
                onClick={() => setModoFiltro('semana')}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${
                  modoFiltro === 'semana'
                    ? 'bg-[#D81B60] text-white shadow'
                    : 'text-[#a3a3a3] hover:text-white'
                }`}
              >
                Semana Cinematográfica
              </button>
              <button
                type="button"
                onClick={() => setModoFiltro('personalizado')}
                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition ${
                  modoFiltro === 'personalizado'
                    ? 'bg-[#D81B60] text-white shadow'
                    : 'text-[#a3a3a3] hover:text-white'
                }`}
              >
                Rango Personalizado
              </button>
            </div>
          </div>

          {modoFiltro === 'semana' ? (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { offset: 0, label: 'Esta Semana' },
                { offset: -1, label: 'Semana Anterior (-1)' },
                { offset: -2, label: 'Hace 2 Semanas (-2)' },
                { offset: -3, label: 'Hace 3 Semanas (-3)' },
              ].map((s) => (
                <button
                  key={s.offset}
                  type="button"
                  onClick={() => setOffsetSemanas(s.offset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition whitespace-nowrap ${
                    offsetSemanas === s.offset
                      ? 'bg-[#F57C00] text-white shadow'
                      : 'bg-[#050505] text-[#a3a3a3] hover:text-white border border-[#262626]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#737373] uppercase font-bold">Desde:</span>
                <input
                  type="date"
                  value={fechaInicioCustom}
                  onChange={(e) => setFechaInicioCustom(e.target.value)}
                  className="bg-[#050505] text-white px-2.5 py-1 rounded-lg border border-[#262626] text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#737373] uppercase font-bold">Hasta:</span>
                <input
                  type="date"
                  value={fechaFinCustom}
                  onChange={(e) => setFechaFinCustom(e.target.value)}
                  className="bg-[#050505] text-white px-2.5 py-1 rounded-lg border border-[#262626] text-xs font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => void fetchDashboard()}
                className="bg-[#D81B60] hover:bg-pink-600 text-white px-3 py-1 rounded-lg font-bold text-xs uppercase"
              >
                Filtrar
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 text-xs p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-triangle-exclamation text-amber-400 text-sm" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => void fetchDashboard()} className="underline font-bold">
            Reintentar
          </button>
        </div>
      )}

      {/* 4 Tarjetas de Indicadores Clave (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Ingresos */}
        <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#a3a3a3] tracking-wider">
                Total de Ingresos
              </span>
              <h3 className="text-2xl sm:text-3xl font-mono font-black text-white mt-1">
                ${kpis?.totalIngresos ?? 0}.00
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 flex items-center justify-center text-lg">
              <i className="fa-solid fa-sack-dollar" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-[#a3a3a3]">
            <span>{kpis?.totalTransacciones ?? 0} transacciones</span>
            <span className="text-emerald-400 font-bold">
              Avg: ${kpis?.ticketPromedio?.toFixed(1) ?? '0.0'}
            </span>
          </div>
        </div>

        {/* KPI 2: Taquilla (Boletos) */}
        <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#a3a3a3] tracking-wider">
                Taquilla & Boletos
              </span>
              <h3 className="text-2xl sm:text-3xl font-mono font-black text-white mt-1">
                ${kpis?.totalTaquilla ?? 0}.00
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#D81B60]/20 border border-[#D81B60]/40 text-[#D81B60] flex items-center justify-center text-lg">
              <i className="fa-solid fa-ticket" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-[#a3a3a3]">
            <span>Boletos vendidos:</span>
            <span className="text-white font-black bg-neutral-800 px-2 py-0.5 rounded">
              {kpis?.boletosVendidos ?? 0}
            </span>
          </div>
        </div>

        {/* KPI 3: Ventas Dulcería */}
        <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#a3a3a3] tracking-wider">
                Ventas Dulcería
              </span>
              <h3 className="text-2xl sm:text-3xl font-mono font-black text-white mt-1">
                ${kpis?.totalDulceria ?? 0}.00
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#F57C00]/20 border border-[#F57C00]/40 text-[#F57C00] flex items-center justify-center text-lg">
              <i className="fa-solid fa-popcorn" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#262626] flex items-center justify-between text-[11px] font-mono text-[#a3a3a3]">
            <span>Artículos vendidos:</span>
            <span className="text-white font-black bg-neutral-800 px-2 py-0.5 rounded">
              {kpis?.productosDulceriaVendidos ?? 0}
            </span>
          </div>
        </div>

        {/* KPI 4: Comparativa Efectivo vs Tarjeta */}
        <div className="bg-[#111111] border border-[#262626] rounded-2xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-full mr-2">
              <span className="text-[10px] font-bold uppercase text-[#a3a3a3] tracking-wider">
                Efectivo vs Tarjeta
              </span>
              <div className="mt-2 space-y-1 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <i className="fa-solid fa-money-bill-wave text-[10px]" /> <span>Efectivo:</span>
                  </span>
                  <span className="text-white font-bold">
                    ${kpis?.efectivo?.total ?? 0} ({kpis?.efectivo?.porcentaje?.toFixed(0) ?? 0}%)
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sky-400 font-bold flex items-center gap-1">
                    <i className="fa-solid fa-credit-card text-[10px]" /> <span>Tarjeta:</span>
                  </span>
                  <span className="text-white font-bold">
                    ${kpis?.tarjeta?.total ?? 0} ({kpis?.tarjeta?.porcentaje?.toFixed(0) ?? 0}%)
                  </span>
                </div>
              </div>
            </div>
            <div className="w-10 h-10 shrink-0 rounded-xl bg-amber-950/60 border border-amber-800/80 text-amber-400 flex items-center justify-center text-lg">
              <i className="fa-solid fa-scale-balanced" />
            </div>
          </div>

          {/* Barra Visual Proporcional */}
          <div className="mt-4 pt-3 border-t border-[#262626]">
            <div className="w-full bg-[#050505] h-2 rounded-full overflow-hidden flex border border-[#262626]">
              <div
                style={{ width: `${kpis?.efectivo?.porcentaje ?? 50}%` }}
                className="bg-emerald-500 h-full transition-all duration-500"
                title={`Efectivo: ${kpis?.efectivo?.porcentaje?.toFixed(1) ?? 0}%`}
              />
              <div
                style={{ width: `${kpis?.tarjeta?.porcentaje ?? 50}%` }}
                className="bg-sky-500 h-full transition-all duration-500"
                title={`Tarjeta: ${kpis?.tarjeta?.porcentaje?.toFixed(1) ?? 0}%`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabla con Registro Detallado de Transacciones */}
      <div className="bg-[#111111] border border-[#262626] rounded-2xl shadow-xl overflow-hidden">
        {/* Barra de Filtros de la Tabla */}
        <div className="p-4 sm:p-5 border-b border-[#262626] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif font-black uppercase text-white text-base tracking-wide flex items-center gap-2">
              <i className="fa-solid fa-receipt text-[#F57C00]" />
              <span>Registro Detallado de Transacciones</span>
            </h3>
            <p className="text-xs text-[#a3a3a3] mt-0.5">
              Desglose de folios, cajeros y métodos de pago registrados en SQL Server
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Buscador Rápido */}
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-[#737373] text-xs" />
              <input
                type="text"
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                placeholder="Buscar folio, cajero..."
                className="bg-[#050505] text-white pl-8 pr-3 py-1.5 rounded-xl border border-[#262626] focus:border-[#D81B60] outline-none text-xs w-44 sm:w-56"
              />
            </div>

            {/* Filtro Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-[#050505] text-white px-2.5 py-1.5 rounded-xl border border-[#262626] text-xs outline-none"
            >
              <option value="todos">Todos los Tipos</option>
              <option value="Taquilla">Taquilla</option>
              <option value="Dulcería">Dulcería</option>
              <option value="Mixto">Mixto</option>
            </select>

            {/* Filtro Método */}
            <select
              value={filtroMetodo}
              onChange={(e) => setFiltroMetodo(e.target.value)}
              className="bg-[#050505] text-white px-2.5 py-1.5 rounded-xl border border-[#262626] text-xs outline-none"
            >
              <option value="todos">Todos los Métodos</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Tarjeta">Tarjeta</option>
            </select>
          </div>
        </div>

        {/* Contenido Tabla */}
        <div className="overflow-x-auto">
          {loading && (
            <div className="py-20 text-center text-xs text-[#a3a3a3] font-mono">
              <i className="fa-solid fa-spinner fa-spin text-2xl text-[#D81B60] block mb-3" />
              <p>Calculando métricas y cargando transacciones desde SQL Server...</p>
            </div>
          )}
          {!loading && transaccionesFiltradas.length === 0 && (
            <div className="py-20 text-center text-xs text-[#737373] space-y-2">
              <i className="fa-solid fa-inbox text-3xl text-neutral-600 block mb-2" />
              <p className="font-bold text-[#a3a3a3] uppercase text-xs">
                No hay transacciones registradas para este periodo o filtro.
              </p>
              <p className="text-[11px] text-[#737373]">
                Prueba seleccionando otra Semana Cinematográfica o un rango de fechas diferente.
              </p>
            </div>
          )}
          {!loading && transaccionesFiltradas.length > 0 && (
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050505] text-[#a3a3a3] uppercase font-mono text-[10px] border-b border-[#262626]">
                <tr>
                  <th className="py-3 px-4">Folio</th>
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Cajero</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4">Artículos / Resumen</th>
                  <th className="py-3 px-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] font-mono">
                {transaccionesFiltradas.map((t) => {
                  const fechaObj = new Date(t.fechaHora);
                  const fechaFormateada = fechaObj.toLocaleDateString('es-MX', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  const horaFormateada = fechaObj.toLocaleTimeString('es-MX', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={t.idVenta} className="hover:bg-[#161616] transition">
                      <td className="py-3 px-4">
                        <span className="bg-[#050505] border border-[#262626] text-[#D81B60] px-2 py-0.5 rounded font-black text-[11px]">
                          VT-{String(t.idVenta).padStart(5, '0')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#a3a3a3] whitespace-nowrap">
                        <span>{fechaFormateada}</span>
                        <span className="text-[#737373] text-[10px] ml-1.5 font-sans">({horaFormateada})</span>
                      </td>
                      <td className="py-3 px-4 text-white font-sans font-bold capitalize">
                        {t.cajero}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-sans ${getTransactionBadgeStyle(t.tipoTransaccion)}`}
                        >
                          {t.tipoTransaccion}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-sans">
                        {t.metodoPago.toLowerCase().includes('tarjeta') ? (
                          <span className="text-sky-400 font-bold flex items-center gap-1.5">
                            <i className="fa-solid fa-credit-card text-[10px]" />
                            <span>Tarjeta</span>
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <i className="fa-solid fa-money-bill-wave text-[10px]" />
                            <span>Efectivo</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-sans text-[#e5e5e5] max-w-xs truncate" title={t.resumenDetalle}>
                        <span className="text-white font-bold mr-1.5 font-mono">[{t.cantidadArticulos}]</span>
                        <span>{t.resumenDetalle}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-white text-sm whitespace-nowrap">
                        ${t.total}.00
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer de la Tabla con Conteo */}
        {!loading && transaccionesFiltradas.length > 0 && (
          <div className="bg-[#050505] p-3 px-5 border-t border-[#262626] flex items-center justify-between text-[11px] text-[#a3a3a3] font-mono">
            <span>
              Mostrando <strong className="text-white">{transaccionesFiltradas.length}</strong> de{' '}
              <strong className="text-white">{data?.transacciones?.length ?? 0}</strong> transacciones
            </span>
            <span>
              Ingreso acumulado en lista:{' '}
              <strong className="text-emerald-400">
                ${transaccionesFiltradas.reduce((s, t) => s + t.total, 0)}.00 MXN
              </strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ApiError } from '@/lib/apiClient';
import { configuracionService } from '@/services/configuracionService';
import {
  ConfiguracionSeguridadDto,
  FailSafeSubredErrorData,
  PaletaColoresTheme,
  TematicaSitioDto,
  TurnoLaboralDto,
} from '@/types/configuracion';
import {
  applyThemeStylesheet,
  broadcastThemeUpdate,
} from '@/components/public/ThemeStylesheetLoader';

function toTimeInputValue(timeStr: string | undefined, fallback: string): string {
  if (!timeStr) return fallback;
  return timeStr.slice(0, 5);
}

function parsePaletaColores(json: string): PaletaColoresTheme {
  try {
    return JSON.parse(json) as PaletaColoresTheme;
  } catch {
    return {};
  }
}

function getSubnetBadgeClass(mismaSubred: boolean): string {
  if (mismaSubred) {
    return 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40';
  }
  return 'bg-amber-950/60 text-amber-300 border-amber-500/40';
}

function getSubnetBadgeText(mismaSubred: boolean): string {
  if (mismaSubred) {
    return 'Misma subred que tu sesión';
  }
  return 'Subred distinta a tu sesión';
}

function getToggleTrackClass(enabled: boolean): string {
  if (enabled) {
    return 'bg-emerald-600 border-emerald-400';
  }
  return 'bg-[#1f1f1f] border-[#333333]';
}

function getToggleThumbClass(enabled: boolean): string {
  if (enabled) {
    return 'translate-x-6 bg-white';
  }
  return 'translate-x-1 bg-[#a3a3a3]';
}

function getThemeCardClass(isActive: boolean): string {
  if (isActive) {
    return 'bg-[#161616] border-[#D81B60] shadow-[0_0_25px_rgba(216,27,96,0.22)]';
  }
  return 'bg-[#111111] border-[#262626] hover:border-[#404040]';
}

function getThemeButtonLabel(isActive: boolean, isActivating: boolean): string {
  if (isActive) return 'Activa en el Sitio Público';
  if (isActivating) return 'Activando...';
  return 'Activar en el Sitio Público';
}

function formatFechaActivacion(fechaIso?: string | null): string {
  if (!fechaIso) return 'Sin activación reciente';
  const parsed = new Date(fechaIso);
  if (Number.isNaN(parsed.getTime())) return 'Activa';
  return parsed.toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const dataObj = err.data as { message?: string } | undefined;
    return dataObj?.message || err.message || fallback;
  }
  const generic = err as { message?: string };
  return generic?.message || fallback;
}

export default function SeguridadTematicasAdminView() {
  const [config, setConfig] = useState<ConfiguracionSeguridadDto | null>(null);
  const [tematicas, setTematicas] = useState<TematicaSitioDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Formulario Módulo A (Mockup 18)
  const [ipAutorizada, setIpAutorizada] = useState<string>('');
  const [horarioInicio, setHorarioInicio] = useState<string>('08:00');
  const [horarioFin, setHorarioFin] = useState<string>('23:00');
  const [autorizarHorasExtras, setAutorizarHorasExtras] = useState<boolean>(false);

  const [savingSeguridad, setSavingSeguridad] = useState<boolean>(false);
  const [seguridadFeedback, setSeguridadFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [failSafeWarning, setFailSafeWarning] = useState<{
    ipClienteDetectada: string;
    ipSolicitada: string;
    message: string;
  } | null>(null);

  // Estado Módulo B (Mockup 19)
  const [activatingThemeId, setActivatingThemeId] = useState<number | null>(null);
  const [themeFeedback, setThemeFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const cargarModulo = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [seguridadData, tematicasData] = await Promise.all([
        configuracionService.getConfiguracionSeguridad(),
        configuracionService.getTematicas(),
      ]);

      setConfig(seguridadData);
      setIpAutorizada(seguridadData.ipAutorizada);
      setHorarioInicio(toTimeInputValue(seguridadData.horarioInicioCajeros, '08:00'));
      setHorarioFin(toTimeInputValue(seguridadData.horarioFinCajeros, '23:00'));
      setAutorizarHorasExtras(seguridadData.autorizarExcepcionHorasExtras);
      setTematicas(Array.isArray(tematicasData) ? tematicasData : []);
    } catch (err) {
      setLoadError(
        extractApiErrorMessage(err, 'No se pudo cargar la configuración de seguridad y temáticas.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      configuracionService.getConfiguracionSeguridad(),
      configuracionService.getTematicas(),
    ])
      .then(([seguridadData, tematicasData]) => {
        if (!isMounted) return;
        setConfig(seguridadData);
        setIpAutorizada(seguridadData.ipAutorizada);
        setHorarioInicio(toTimeInputValue(seguridadData.horarioInicioCajeros, '08:00'));
        setHorarioFin(toTimeInputValue(seguridadData.horarioFinCajeros, '23:00'));
        setAutorizarHorasExtras(seguridadData.autorizarExcepcionHorasExtras);
        setTematicas(Array.isArray(tematicasData) ? tematicasData : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(
          extractApiErrorMessage(err, 'No se pudo cargar la configuración de seguridad y temáticas.')
        );
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const enviarActualizacionSeguridad = async (confirmarCambioRed: boolean) => {
    setSeguridadFeedback(null);
    setFailSafeWarning(null);

    if (!ipAutorizada.trim()) {
      setSeguridadFeedback({
        type: 'error',
        text: 'Debes capturar una dirección IPv4 o IPv6 autorizada.',
      });
      return;
    }

    try {
      setSavingSeguridad(true);
      const updated = await configuracionService.actualizarConfiguracionSeguridad({
        sucursalId: config?.sucursalId,
        ipAutorizada: ipAutorizada.trim(),
        horarioInicioCajeros: horarioInicio,
        horarioFinCajeros: horarioFin,
        autorizarExcepcionHorasExtras: autorizarHorasExtras,
        confirmarCambioRed,
      });

      setConfig(updated);
      setIpAutorizada(updated.ipAutorizada);
      setHorarioInicio(toTimeInputValue(updated.horarioInicioCajeros, horarioInicio));
      setHorarioFin(toTimeInputValue(updated.horarioFinCajeros, horarioFin));
      setAutorizarHorasExtras(updated.autorizarExcepcionHorasExtras);
      setSeguridadFeedback({
        type: 'success',
        text: `Configuración guardada. Los cajeros ahora se validan contra la IP ${updated.ipAutorizada}.`,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const data = (err.data || {}) as FailSafeSubredErrorData;
        if (data.requiereConfirmacion) {
          setFailSafeWarning({
            ipClienteDetectada: data.ipClienteDetectada || config?.ipClienteDetectada || 'Desconocida',
            ipSolicitada: data.ipSolicitada || ipAutorizada.trim(),
            message:
              data.message ||
              'La IP solicitada pertenece a una subred distinta a tu sesión actual.',
          });
          return;
        }
      }

      setSeguridadFeedback({
        type: 'error',
        text: extractApiErrorMessage(err, 'Error al actualizar la configuración de seguridad.'),
      });
    } finally {
      setSavingSeguridad(false);
    }
  };

  const handleSubmitSeguridad = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await enviarActualizacionSeguridad(false);
  };

  const handleApplyTurno = (turno: TurnoLaboralDto) => {
    setHorarioInicio(toTimeInputValue(turno.horaInicio, '08:00'));
    setHorarioFin(toTimeInputValue(turno.horaFin, '23:00'));
  };

  const handleActivarTematica = async (tematica: TematicaSitioDto) => {
    setThemeFeedback(null);
    try {
      setActivatingThemeId(tematica.id);
      const activada = await configuracionService.activarTematica(tematica.id);

      setTematicas((prev) =>
        prev.map((item) =>
          item.id === activada.id
            ? { ...activada, esActiva: true }
            : { ...item, esActiva: false }
        )
      );

      applyThemeStylesheet(activada);
      broadcastThemeUpdate(activada);

      setThemeFeedback({
        type: 'success',
        text: `Temática "${activada.nombreTematica}" activada en el sitio público (${activada.rutaArchivoCss}).`,
      });
    } catch (err) {
      setThemeFeedback({
        type: 'error',
        text: extractApiErrorMessage(err, 'No se pudo activar la temática seleccionada.'),
      });
    } finally {
      setActivatingThemeId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-[#111111] border border-[#262626] rounded-2xl" />
        <div className="h-72 bg-[#111111] border border-[#262626] rounded-2xl" />
        <div className="h-72 bg-[#111111] border border-[#262626] rounded-2xl" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-950/30 border border-red-600/50 rounded-2xl p-6 text-center space-y-3">
        <i className="fa-solid fa-triangle-exclamation text-red-400 text-2xl" aria-hidden="true" />
        <h2 className="text-base font-bold text-white uppercase">Error al cargar Seguridad y Temáticas</h2>
        <p className="text-xs text-red-200">{loadError}</p>
        <button
          type="button"
          onClick={() => void cargarModulo()}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <i className="fa-solid fa-rotate-right mr-1.5" aria-hidden="true" /> Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Encabezado General */}
      <div className="border-b border-[#262626] pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <i className="fa-solid fa-shield-halved text-[#D81B60]" aria-hidden="true" />
            <span>Seguridad IP y Motor de Temáticas Estacionales</span>
          </h1>
          <p className="text-xs text-[#a3a3a3] mt-1">
            Administra el perímetro de red para Cajeros/Vendedores, horarios laborales y la apariencia estacional del portal público sin downtime.
          </p>
        </div>

        {config && (
          <div className="bg-[#111111] border border-[#262626] rounded-xl px-4 py-2.5 flex items-center gap-3">
            <i className="fa-solid fa-network-wired text-sky-400 text-sm" aria-hidden="true" />
            <div className="text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#a3a3a3]">
                Tu IP Detectada (Admin)
              </span>
              <span className="font-mono text-xs font-bold text-white">
                {config.ipClienteDetectada}
              </span>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getSubnetBadgeClass(
                config.mismaSubredQueCliente
              )}`}
            >
              {getSubnetBadgeText(config.mismaSubredQueCliente)}
            </span>
          </div>
        )}
      </div>

      {/* MÓDULO A: CONTROL DE ACCESOS Y SEGURIDAD IP (Mockup 18) */}
      <section
        aria-labelledby="heading-modulo-seguridad"
        className="bg-[#111111] border border-[#262626] rounded-2xl p-6 shadow-xl space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D81B60]/15 border border-[#D81B60]/40 flex items-center justify-center text-[#D81B60]">
              <i className="fa-solid fa-lock text-base" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-modulo-seguridad" className="text-base font-bold uppercase tracking-wider text-white">
                Control de Accesos y Seguridad IP
              </h2>
              <p className="text-xs text-[#a3a3a3]">
                Sucursal: <strong className="text-white">{config?.sucursalNombre || 'Matriz'}</strong> • Bypass estricto activo para rol Administrador.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono bg-[#050505] text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-lg uppercase">
            <i className="fa-solid fa-user-shield mr-1.5" aria-hidden="true" /> Bypass Admin Activo
          </span>
        </div>

        <form onSubmit={handleSubmitSeguridad} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campo IpAutorizada */}
            <div className="bg-[#080808] border border-[#262626] rounded-xl p-4 space-y-2.5">
              <label
                htmlFor="input-ip-autorizada"
                className="block text-xs font-bold uppercase tracking-wider text-[#d4d4d4]"
              >
                <i className="fa-solid fa-globe text-[#D81B60] mr-1.5" aria-hidden="true" />
                IP Autorizada de Sucursal (IPv4 / IPv6)
              </label>
              <input
                id="input-ip-autorizada"
                type="text"
                value={ipAutorizada}
                onChange={(e) => setIpAutorizada(e.target.value)}
                placeholder="Ej. 192.168.1.200"
                maxLength={45}
                className="w-full bg-[#111111] border border-[#333333] focus:border-[#D81B60] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
              />
              <p className="text-[11px] text-[#8a8a8a]">
                IP por defecto: <span className="font-mono text-[#d4d4d4]">{config?.ipDefecto || '192.168.1.100'}</span>
              </p>
            </div>

            {/* HorarioInicioCajeros y HorarioFinCajeros */}
            <div className="lg:col-span-2 bg-[#080808] border border-[#262626] rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#d4d4d4]">
                  <i className="fa-solid fa-clock text-[#F57C00] mr-1.5" aria-hidden="true" />
                  Horario Laboral Autorizado para Cajeros / Vendedores
                </span>

                {config && config.turnosLaborales.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {config.turnosLaborales.map((turno) => (
                      <button
                        key={turno.id}
                        type="button"
                        onClick={() => handleApplyTurno(turno)}
                        className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-[#161616] border border-[#333333] text-[#d4d4d4] hover:border-[#D81B60] hover:text-white transition-colors"
                      >
                        {turno.nombreTurno} ({toTimeInputValue(turno.horaInicio, '')}-{toTimeInputValue(turno.horaFin, '')})
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setHorarioInicio('08:00');
                        setHorarioFin('23:00');
                      }}
                      className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg bg-[#161616] border border-[#333333] text-[#d4d4d4] hover:border-[#D81B60] hover:text-white transition-colors"
                    >
                      Completo (08:00-23:00)
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="input-horario-inicio"
                    className="block text-[11px] font-semibold uppercase text-[#a3a3a3] mb-1"
                  >
                    Hora de Inicio (Apertura Taquilla)
                  </label>
                  <input
                    id="input-horario-inicio"
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] focus:border-[#D81B60] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-horario-fin"
                    className="block text-[11px] font-semibold uppercase text-[#a3a3a3] mb-1"
                  >
                    Hora de Fin (Cierre Taquilla)
                  </label>
                  <input
                    id="input-horario-fin"
                    type="time"
                    value={horarioFin}
                    onChange={(e) => setHorarioFin(e.target.value)}
                    className="w-full bg-[#111111] border border-[#333333] focus:border-[#D81B60] rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Toggle AutorizarExcepcionHorasExtras */}
          <div className="bg-[#080808] border border-[#262626] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <label
                htmlFor="toggle-horas-extras"
                className="text-sm font-bold text-white cursor-pointer flex items-center gap-2"
              >
                <i className="fa-solid fa-business-time text-amber-400" aria-hidden="true" />
                <span>Autorizar Excepción / Horas Extras</span>
              </label>
              <p className="text-xs text-[#a3a3a3]">
                Cuando está activo, permite que los cajeros inicien sesión fuera del horario laboral regular ({horarioInicio} - {horarioFin}).
              </p>
            </div>

            <button
              id="toggle-horas-extras"
              type="button"
              role="switch"
              aria-checked={autorizarHorasExtras}
              aria-label="Autorizar Excepción / Horas Extras"
              onClick={() => setAutorizarHorasExtras((prev) => !prev)}
              className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full border transition-colors ${getToggleTrackClass(
                autorizarHorasExtras
              )}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full transition-transform ${getToggleThumbClass(
                  autorizarHorasExtras
                )}`}
              />
            </button>
          </div>

          {/* Banner Fail-Safe de Subred */}
          {failSafeWarning && (
            <div
              role="alert"
              className="bg-amber-950/40 border border-amber-500/60 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <i
                  className="fa-solid fa-triangle-exclamation text-amber-400 text-lg mt-0.5"
                  aria-hidden="true"
                />
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Protección Fail-Safe: Subred Diferente Detectada
                  </h3>
                  <p className="text-xs text-amber-100">{failSafeWarning.message}</p>
                  <p className="text-[11px] font-mono text-amber-200/90">
                    Origen Admin: {failSafeWarning.ipClienteDetectada} &rarr; Nueva IP: {failSafeWarning.ipSolicitada}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setFailSafeWarning(null)}
                  className="px-3.5 py-2 rounded-lg bg-[#1a1a1a] border border-[#333333] text-xs font-bold text-white hover:bg-[#262626]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingSeguridad}
                  onClick={() => void enviarActualizacionSeguridad(true)}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-black uppercase text-white transition-colors"
                >
                  <i className="fa-solid fa-shield-check mr-1.5" aria-hidden="true" />
                  Confirmar Cambio de Red y Guardar
                </button>
              </div>
            </div>
          )}

          {/* Feedback Guardado */}
          {seguridadFeedback && (
            <div
              role="status"
              className={`rounded-xl px-4 py-3 text-xs flex items-center gap-2 border ${
                seguridadFeedback.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-red-950/40 border-red-500/50 text-red-200'
              }`}
            >
              <i
                className={`fa-solid ${
                  seguridadFeedback.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'
                }`}
                aria-hidden="true"
              />
              <span>{seguridadFeedback.text}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#262626]">
            <span className="text-[11px] text-[#737373] font-mono">
              Última modificación: {formatFechaActivacion(config?.fechaUltimaModificacion)}
            </span>

            <button
              type="submit"
              disabled={savingSeguridad}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D81B60] to-[#F57C00] hover:from-pink-600 hover:to-orange-500 text-white text-xs font-black uppercase tracking-wider shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
              <span>{savingSeguridad ? 'Guardando...' : 'Guardar Configuración de Seguridad'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* MÓDULO B: MOTOR DE TEMÁTICAS ESTACIONALES (Mockup 19) */}
      <section
        aria-labelledby="heading-modulo-tematicas"
        className="bg-[#111111] border border-[#262626] rounded-2xl p-6 shadow-xl space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#262626] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <i className="fa-solid fa-palette text-base" aria-hidden="true" />
            </div>
            <div>
              <h2 id="heading-modulo-tematicas" className="text-base font-bold uppercase tracking-wider text-white">
                Motor de Temáticas Estacionales
              </h2>
              <p className="text-xs text-[#a3a3a3]">
                Selecciona una de las 4 plantillas CSS estáticas pre-programadas para actualizar el portal público en tiempo real sin recarga.
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono bg-[#050505] text-sky-400 border border-sky-500/30 px-3 py-1 rounded-lg uppercase">
            <i className="fa-solid fa-bolt mr-1.5" aria-hidden="true" /> Sincronización SSE Cero Downtime
          </span>
        </div>

        {themeFeedback && (
          <div
            role="status"
            className={`rounded-xl px-4 py-3 text-xs flex items-center gap-2 border ${
              themeFeedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/40 border-red-500/50 text-red-200'
            }`}
          >
            <i
              className={`fa-solid ${
                themeFeedback.type === 'success' ? 'fa-wand-magic-sparkles' : 'fa-circle-exclamation'
              }`}
              aria-hidden="true"
            />
            <span>{themeFeedback.text}</span>
          </div>
        )}

        {tematicas.length === 0 ? (
          <div className="p-8 rounded-xl border border-[#262626] bg-[#080808] text-center space-y-2">
            <i className="fa-solid fa-swatchbook text-[#737373] text-2xl" aria-hidden="true" />
            <p className="text-xs font-bold uppercase text-white">Sin temáticas registradas</p>
            <p className="text-xs text-[#a3a3a3]">
              No se encontraron plantillas CSS configuradas en la base de datos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {tematicas.map((tema) => {
              const paleta = parsePaletaColores(tema.paletaColoresJson);
              const isActivating = activatingThemeId === tema.id;
              return (
                <article
                  key={tema.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all ${getThemeCardClass(
                    tema.esActiva
                  )}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="w-11 h-11 rounded-xl border border-white/10 flex items-center justify-center text-lg shadow-inner"
                        style={{
                          backgroundColor: paleta.surface || '#181818',
                          color: paleta.primary || '#D81B60',
                        }}
                      >
                        <i className={`fa-solid ${tema.icono || 'fa-palette'}`} aria-hidden="true" />
                      </div>

                      {tema.esActiva && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/70 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                          <i className="fa-solid fa-circle-check" aria-hidden="true" /> Activa
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-white">{tema.nombreTematica}</h3>
                      <span className="text-[11px] font-mono text-[#8a8a8a] block mt-0.5">
                        {tema.claveIdentificadora}
                      </span>
                    </div>

                    {/* Muestras de Paleta Pre-programada */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] uppercase font-bold text-[#a3a3a3] mr-1">
                        Paleta:
                      </span>
                      {[paleta.primary, paleta.secondary, paleta.background]
                        .filter((color): color is string => Boolean(color))
                        .map((color, idx) => (
                          <span
                            key={`${tema.id}-swatch-${idx}`}
                            title={color}
                            className="w-5 h-5 rounded-full border border-white/25 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                    </div>

                    <div className="space-y-1 text-[11px] text-[#a3a3a3] border-t border-[#262626] pt-3">
                      <p className="truncate" title={tema.tipografia}>
                        <i className="fa-solid fa-font mr-1.5 text-[#737373]" aria-hidden="true" />
                        {tema.tipografia}
                      </p>
                      <p className="font-mono text-[10px] truncate text-[#8a8a8a]" title={tema.rutaArchivoCss}>
                        <i className="fa-solid fa-file-code mr-1.5 text-[#737373]" aria-hidden="true" />
                        {tema.rutaArchivoCss}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={tema.esActiva || isActivating}
                    onClick={() => void handleActivarTematica(tema)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      tema.esActiva
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 cursor-default'
                        : 'bg-[#D81B60] hover:bg-pink-600 text-white shadow-md disabled:opacity-50'
                    }`}
                  >
                    <i
                      className={`fa-solid ${tema.esActiva ? 'fa-check' : 'fa-wand-magic-sparkles'}`}
                      aria-hidden="true"
                    />
                    <span>{getThemeButtonLabel(tema.esActiva, isActivating)}</span>
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

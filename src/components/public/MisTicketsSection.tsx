'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { PreordenDto } from '@/types/api';
import { carteleraService } from '@/services/carteleraService';
import { generarQrDataUrl } from '@/lib/qrcode';
import { normalizeMexicanPhone, formatTicketValidityDate } from '@/lib/phoneUtils';

interface MisTicketsSectionProps {
  tickets: PreordenDto[];
  verifiedPhone: string | null;
  onOpenQr: (ticket: PreordenDto) => void;
  onGoToNewPreorder: () => void;
  onTicketsRecovered: (phone: string, recoveredTickets: PreordenDto[]) => void;
  onChangeVerifiedPhone: () => void;
}

interface TicketMiniQrProps {
  codigo: string;
}

function TicketMiniQr({ codigo }: Readonly<TicketMiniQrProps>) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function loadQr() {
      const url = await generarQrDataUrl(codigo);
      if (isMounted) {
        setQrUrl(url);
      }
    }
    void loadQr();
    return () => {
      isMounted = false;
    };
  }, [codigo]);

  return (
    <div className="w-16 h-16 rounded-2xl bg-white p-1.5 shrink-0 shadow border border-black/10 flex items-center justify-center">
      {qrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt={`Miniatura QR ${codigo}`}
          className="w-full h-full object-contain"
        />
      ) : (
        <svg
          aria-hidden="true"
          className="w-8 h-8 text-neutral-800"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 4h2m4-4v6m-4-2h4"
          />
        </svg>
      )}
    </div>
  );
}

interface TicketCardItemProps {
  ticket: PreordenDto;
  onOpenQr: (ticket: PreordenDto) => void;
}

function TicketCardItem({ ticket, onOpenQr }: Readonly<TicketCardItemProps>) {
  const isPending = ticket.estadoActivo !== false;
  const statusLabel = isPending ? 'Pendiente' : 'Canjeado';
  const statusClasses = isPending
    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
    : 'bg-neutral-800 text-neutral-400 border-neutral-600/40';
  const boletosLabel = ticket.boletosGeneral === 1 ? 'Boleto' : 'Boletos';
  const vigenciaDias = ticket.vigenciaDias || 12;
  const validityText = formatTicketValidityDate(ticket.fechaCreacion, vigenciaDias);
  const totalCombos = ticket.combos ? ticket.combos.reduce((acc, c) => acc + c.cantidad, 0) : 0;

  return (
    <div className="bg-[#121212] border border-[#262626] rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-[#E11D2F]/50 transition-all">
      <div className="flex items-center gap-4 w-full md:w-auto">
        <TicketMiniQr codigo={ticket.codigo} />

        <div className="flex flex-col min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className="font-mono text-xs font-bold text-[#E11D2F] uppercase tracking-wider">
              {ticket.codigo}
            </span>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border tracking-wider ${statusClasses}`}
            >
              {statusLabel}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-['Playfair_Display',serif] font-black uppercase text-white leading-tight">
            {ticket.pelicula}
          </h3>

          <p className="text-xs text-[#A0A0A0] font-sans mt-1">
            Horario: <strong className="text-white">{ticket.horario}</strong> • {ticket.boletosGeneral} {boletosLabel}
            {totalCombos > 0 ? ` • ${totalCombos} Combo(s)` : ''}
          </p>

          <span className="text-[11px] text-[#DCA54C] mt-1 font-semibold">
            Válido hasta: {validityText} ({vigenciaDias} días de vigencia)
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between md:justify-end gap-5 w-full md:w-auto border-t md:border-t-0 border-[#262626] pt-4 md:pt-0">
        <div className="text-left md:text-right">
          <span className="text-[10px] text-[#A0A0A0] uppercase font-bold tracking-wider block">
            Importe en Caja
          </span>
          <span className="text-xl sm:text-2xl font-['Playfair_Display',serif] font-black text-white font-mono">
            ${ticket.total} MXN
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenQr(ticket)}
          className="bg-[#0A0A0A] hover:bg-[#E11D2F] text-white text-xs font-bold uppercase tracking-wider px-5 py-3 rounded-xl border border-[#262626] hover:border-[#E11D2F] transition-all flex items-center gap-2 shadow cursor-pointer shrink-0"
        >
          <svg
            aria-hidden="true"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 4h5v5H4V4zm11 0h5v5h-5V4zM4 15h5v5H4v-5zm11 4h2m3-4v5m-5-2h3"
            />
          </svg>
          <span>Ver QR</span>
        </button>
      </div>
    </div>
  );
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const candidate = err as { message?: string; data?: { error?: string; message?: string } };
    if (candidate.data?.error) return candidate.data.error;
    if (candidate.data?.message) return candidate.data.message;
    if (candidate.message) return candidate.message;
  }
  return fallback;
}

let onlineStatusOverride: boolean | null = null;
let activeOnlineSubscribers = 0;

function subscribeOnlineStatus(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  activeOnlineSubscribers += 1;

  const handleOnline = () => {
    onlineStatusOverride = true;
    callback();
  };
  const handleOffline = () => {
    onlineStatusOverride = false;
    callback();
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    activeOnlineSubscribers = Math.max(0, activeOnlineSubscribers - 1);
    if (activeOnlineSubscribers === 0) {
      onlineStatusOverride = null;
    }
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

function getOnlineSnapshot(): boolean {
  if (onlineStatusOverride !== null) {
    return onlineStatusOverride;
  }
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function getServerOnlineSnapshot(): boolean {
  return true;
}

export default function MisTicketsSection({
  tickets,
  verifiedPhone,
  onOpenQr,
  onGoToNewPreorder,
  onTicketsRecovered,
  onChangeVerifiedPhone,
}: Readonly<MisTicketsSectionProps>) {
  const isOnline = useSyncExternalStore(
    subscribeOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );
  const canShowTickets = !isOnline || verifiedPhone !== null;
  const isRecoveryPanelVisible = isOnline && verifiedPhone === null;

  // Flujo de recuperación por teléfono + código SMS (Twilio)
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('');
  const [maskedPhone, setMaskedPhone] = useState<string>('');
  const [expiresMinutes, setExpiresMinutes] = useState<number>(10);
  const [isSendingSms, setIsSendingSms] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);

  const handleRecoveryPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { phone, error } = normalizeMexicanPhone(e.target.value);
    setPhoneInput(phone);
    setPhoneError(error);
    setRecoveryError(null);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(digitsOnly);
    setRecoveryError(null);
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    if (!isOnline) {
      setRecoveryError('Necesitas conexión a internet para recibir el código SMS.');
      return;
    }

    const { phone, error } = normalizeMexicanPhone(phoneInput);
    setPhoneInput(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    try {
      setIsSendingSms(true);
      const res = await carteleraService.solicitarCodigoPreordenes(phone);
      setMaskedPhone(res.telefonoEnmascarado || `******${phone.slice(-4)}`);
      setExpiresMinutes(res.expiraEnMinutos || 10);
      setOtpCode('');
      setStep('code');
    } catch (err: unknown) {
      setRecoveryError(
        getApiErrorMessage(err, 'No fue posible enviar el código SMS a este teléfono.')
      );
    } finally {
      setIsSendingSms(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (otpCode.length !== 6) {
      setRecoveryError('Ingresa el código completo de 6 dígitos.');
      return;
    }

    try {
      setIsVerifyingCode(true);
      const { phone: normalizedPhone } = normalizeMexicanPhone(phoneInput);
      const recovered = await carteleraService.verificarCodigoPreordenes(normalizedPhone, otpCode);
      onTicketsRecovered(normalizedPhone, recovered);
      setRecoverySuccess(
        `Se sincronizaron ${recovered.length} ticket(s) del +52 ${maskedPhone} y quedaron guardados en este dispositivo para usarlos sin conexión.`
      );
      setStep('phone');
      setOtpCode('');
    } catch (err: unknown) {
      setRecoveryError(
        getApiErrorMessage(err, 'El código ingresado es incorrecto o ha expirado.')
      );
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleChangePhoneStep = () => {
    setStep('phone');
    setOtpCode('');
    setRecoveryError(null);
  };

  const handleResetToSmsSearch = () => {
    setStep('phone');
    setOtpCode('');
    setRecoveryError(null);
    setRecoverySuccess(null);
    onChangeVerifiedPhone();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Barra de teléfono verificado o aviso offline */}
      {(!isOnline || verifiedPhone !== null) && (
        <div className="bg-[#121212] border border-[#262626] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            {!isOnline && (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 rounded-xl">
                <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.5a9.9 9.9 0 015.5-2.6M12 20h.01" />
                </svg>
                <span>Modo sin conexión • Leyendo tickets guardados en el dispositivo</span>
              </span>
            )}

            {isOnline && verifiedPhone !== null && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4D4D4] bg-[#0A0A0A] border border-[#262626] px-3 py-1.5 rounded-xl font-mono">
                Verificado: +52 ******{verifiedPhone.slice(-4)}
              </span>
            )}
          </div>

          {isOnline && verifiedPhone !== null && (
            <button
              type="button"
              onClick={handleResetToSmsSearch}
              className="bg-[#0A0A0A] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#E11D2F] text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#E11D2F]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Consultar otro número</span>
            </button>
          )}
        </div>
      )}

      {/* Mensaje de confirmación tras recuperar vía SMS */}
      {recoverySuccess && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-3 rounded-2xl flex items-center gap-2.5">
          <svg aria-hidden="true" className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span>{recoverySuccess}</span>
        </div>
      )}

      {/* Panel de Recuperación por Teléfono y Código SMS (Twilio) */}
      {isRecoveryPanelVisible && (
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-6 sm:p-8 shadow-xl space-y-5">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#E11D2F]/15 border border-[#E11D2F]/40 flex items-center justify-center text-[#E11D2F] shrink-0">
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-['Playfair_Display',serif] font-black uppercase text-white">
                Recupera tus Tickets por Teléfono (SMS)
              </h2>
              <p className="text-xs text-[#A0A0A0] font-sans mt-1 leading-relaxed">
                Ingresa el número de teléfono con el que realizaste tu pre-orden. Te enviaremos un código de verificación por SMS para descargar tus códigos QR y guardarlos en este dispositivo.
              </p>
            </div>
          </div>

          {!isOnline ? (
            <div className="bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs px-4 py-3 rounded-xl">
              Sin conexión a internet: la consulta por SMS requiere red móvil o Wi-Fi. Tus tickets guardados previamente siguen accesibles abajo sin conexión.
            </div>
          ) : (
            <>
              {step === 'phone' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label
                      htmlFor="input-recovery-telefono"
                      className="block text-xs font-bold uppercase text-[#A0A0A0] mb-1.5"
                    >
                      Teléfono registrado (10 dígitos - México) *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex items-center flex-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-3 bg-[#171717] border border-r-0 border-[#262626] rounded-l-xl text-xs font-semibold text-[#D4D4D4] select-none">
                          <span className="font-mono text-white text-xs">+52</span>
                        </span>
                        <input
                          id="input-recovery-telefono"
                          type="tel"
                          value={phoneInput}
                          onChange={handleRecoveryPhoneChange}
                          placeholder="Ej. 7731234567"
                          maxLength={15}
                          required
                          className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E11D2F] rounded-r-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingSms}
                        className="bg-[#E11D2F] hover:bg-[#c81928] disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                      >
                        {isSendingSms ? 'Enviando código...' : 'Enviar código SMS'}
                      </button>
                    </div>
                    {phoneError && (
                      <p className="text-[11px] text-red-400 mt-1.5">{phoneError}</p>
                    )}
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="bg-emerald-950/30 border border-emerald-500/40 text-emerald-200 text-xs px-4 py-3 rounded-xl">
                    Enviamos un código de 6 dígitos al <strong>+52 {maskedPhone}</strong>. Válido durante {expiresMinutes} minutos.
                  </div>

                  <div>
                    <label
                      htmlFor="input-recovery-codigo"
                      className="block text-xs font-bold uppercase text-[#A0A0A0] mb-1.5"
                    >
                      Código de verificación (6 dígitos) *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        id="input-recovery-codigo"
                        type="text"
                        inputMode="numeric"
                        value={otpCode}
                        onChange={handleOtpChange}
                        placeholder="000000"
                        maxLength={6}
                        required
                        className="flex-1 bg-[#0A0A0A] border border-[#262626] focus:border-[#E11D2F] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors font-mono tracking-[0.4em] text-center"
                      />
                      <button
                        type="submit"
                        disabled={isVerifyingCode}
                        className="bg-[#E11D2F] hover:bg-[#c81928] disabled:opacity-50 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shrink-0"
                      >
                        {isVerifyingCode ? 'Verificando...' : 'Verificar y Ver Tickets'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => void handleSendCode()}
                      disabled={isSendingSms}
                      className="text-[#DCA54C] hover:underline font-semibold cursor-pointer"
                    >
                      {isSendingSms ? 'Reenviando...' : 'Reenviar código SMS'}
                    </button>
                    <button
                      type="button"
                      onClick={handleChangePhoneStep}
                      className="text-[#A0A0A0] hover:text-white underline cursor-pointer"
                    >
                      Cambiar número de teléfono
                    </button>
                  </div>
                </form>
              )}

              {recoveryError && (
                <div className="bg-red-950/40 border border-red-600/40 text-red-300 text-xs px-4 py-3 rounded-xl">
                  {recoveryError}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Guía sin exposición de tickets antes de verificar SMS en línea */}
      {!canShowTickets && (
        <div className="bg-[#121212] border border-[#262626] rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-[#A0A0A0]">
            {tickets.length > 0
              ? 'Hay boletos guardados en caché para uso sin internet. Por privacidad, verifica tu número por SMS arriba para mostrar solo los tickets de tu teléfono.'
              : 'Ingresa el número de teléfono con el que apartaste tus boletos para recibir tu código SMS.'}
          </p>
          <button
            type="button"
            onClick={onGoToNewPreorder}
            className="text-xs font-bold uppercase tracking-wider text-[#DCA54C] hover:underline shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Generar Pre-orden
          </button>
        </div>
      )}

      {/* Estado vacío tras verificar o sin caché en modo offline */}
      {canShowTickets && tickets.length === 0 && (
        <div className="bg-[#121212] border border-[#262626] rounded-3xl p-10 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#1c1c1c] mx-auto flex items-center justify-center text-[#A0A0A0]">
            <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white uppercase">Aún no tienes tickets guardados</h2>
          <p className="text-xs text-[#A0A0A0] max-w-md mx-auto">
            Cuando confirmes tus boletos en línea o recuperes tu teléfono por SMS, tus códigos QR quedarán guardados en este dispositivo para usarlos sin conexión.
          </p>
          <button
            type="button"
            onClick={onGoToNewPreorder}
            className="mt-2 bg-[#E11D2F] hover:bg-[#c81928] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            Generar Pre-orden
          </button>
        </div>
      )}

      {/* Lista de Tickets (solo visible tras verificar SMS online, o desde caché en modo offline) */}
      {canShowTickets && tickets.length > 0 && (
        <div className="space-y-4">
          {tickets.map((ticket) => (
            <TicketCardItem key={ticket.codigo} ticket={ticket} onOpenQr={onOpenQr} />
          ))}
        </div>
      )}
    </div>
  );
}

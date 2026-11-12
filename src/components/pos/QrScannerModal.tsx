'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PreordenDto } from '@/types/api';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (codigo: string) => void | Promise<void>;
  onScanCode?: (codigo: string) => void | Promise<void>;
  preordenesActivas?: PreordenDto[];
  errorExterno?: string | null;
}

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
}

function getBarcodeDetector(): BarcodeDetectorLike | null {
  if (globalThis.window === undefined) return null;
  const win = globalThis.window as unknown as {
    BarcodeDetector?: new (options?: { formats: string[] }) => BarcodeDetectorLike;
  };
  if (!win.BarcodeDetector) return null;
  try {
    return new win.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

function extractFolioFromFileName(fileName: string): string | null {
  const upper = fileName.toUpperCase();
  const match = /(PRE-XIL-[A-Z0-9-]+|XIL-[A-Z0-9-]+)/.exec(upper);
  return match ? match[1] : null;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  onScanCode,
  preordenesActivas = [],
  errorExterno = null,
}: Readonly<QrScannerModalProps>) {
  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('Solicitando acceso a la cámara...');
  const [cameraActive, setCameraActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setLocalError(null);
    setCameraStatus('Solicitando acceso a la cámara...');

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setCameraStatus('Cámara no disponible en este entorno • Usa ingreso manual o archivo QR');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setCameraStatus('Cámara óptica activa • Apunta al código QR del cliente');
    } catch {
      setCameraActive(false);
      setCameraStatus('Permiso de cámara no concedido • Usa ingreso manual o sube imagen QR');
    }
  }, [stopCamera]);

  useEffect(() => {
    let active = true;
    const initCamera = async () => {
      await Promise.resolve();
      if (!active) return;
      if (!isOpen) {
        stopCamera();
        return;
      }
      setLocalError(null);
      await startCamera();
    };
    void initCamera();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen, startCamera, stopCamera]);

  const ejecutarValidacion = async (folioRaw: string) => {
    const trimmed = folioRaw.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setLocalError(null);
    try {
      const callback = onScanSuccess || onScanCode;
      if (callback) {
        await callback(trimmed);
      }
      setCodigo('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Error al validar la pre-orden QR.');
    } finally {
      setLoading(false);
    }
  };

  // Escaneo en vivo mientras la cámara esté activa (HU-08 / T1)
  useEffect(() => {
    if (!isOpen || !cameraActive || loading) return;

    let scanTimer: NodeJS.Timeout | null = null;
    let isProcessing = false;

    const scanFrame = async () => {
      if (isProcessing || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      const detector = getBarcodeDetector();
      if (detector) {
        isProcessing = true;
        try {
          const results = await detector.detect(video);
          const detected = results[0]?.rawValue?.trim();
          if (detected) {
            setCodigo(detected.toUpperCase());
            await ejecutarValidacion(detected);
            return;
          }
        } catch {
          // Ignorar frames intermedios sin código
        } finally {
          isProcessing = false;
        }
      }
    };

    scanTimer = setInterval(() => {
      void scanFrame();
    }, 250);

    return () => {
      if (scanTimer) clearInterval(scanTimer);
    };
  }, [isOpen, cameraActive, loading]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await ejecutarValidacion(codigo);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);

    const detector = getBarcodeDetector();
    if (detector && typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        const results = await detector.detect(bitmap);
        const detectedValue = results[0]?.rawValue?.trim();
        if (detectedValue) {
          setCodigo(detectedValue.toUpperCase());
          await ejecutarValidacion(detectedValue);
          return;
        }
      } catch {
        // Fallback a extracción por nombre de archivo
      }
    }

    const fallbackFolio = extractFolioFromFileName(file.name);
    if (fallbackFolio) {
      setCodigo(fallbackFolio);
      await ejecutarValidacion(fallbackFolio);
      return;
    }

    setCameraStatus(`Archivo "${file.name}" cargado • Verifica o confirma el folio abajo`);
  };

  const mensajeError = localError || errorExterno;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-[460px] rounded-[20px] border border-white/10 bg-[#141414] px-7 py-6 shadow-[0_25px_70px_rgba(0,0,0,0.9)]">
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar lector QR"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-gray-300 transition hover:bg-white/15 hover:text-white"
        >
          <i className="fa-solid fa-xmark text-sm" aria-hidden="true" />
        </button>

        {/* Encabezado Mockup 15 */}
        <div className="mb-4 flex flex-col items-center text-center">
          <span className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#D81B60]/50 bg-[#D81B60]/15 px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#FF4081]">
            <i className="fa-solid fa-qrcode" /> HARDWARE / ESCÁNER DE PRE-ORDEN
          </span>
          <h3 className="text-[20px] font-black uppercase tracking-tight text-white">
            LECTURA DE CÓDIGO QR EN CAJA
          </h3>
          <p className="mt-1 text-xs text-gray-400">
            Escanea el ticket digital del cliente o selecciona una pre-orden activa
          </p>
        </div>

        {/* Visor de cámara con guías y láser (Mockup 15) */}
        <div className="relative mb-3.5 h-[195px] w-full overflow-hidden rounded-xl border border-dashed border-[#D81B60] bg-[#090909]">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${cameraActive ? 'opacity-85' : 'opacity-0'}`}
          />

          {/* Esquinas guía rosas */}
          <span className="pointer-events-none absolute left-4 top-4 h-5 w-5 rounded-tl border-l-2 border-t-2 border-[#D81B60]" />
          <span className="pointer-events-none absolute right-4 top-4 h-5 w-5 rounded-tr border-r-2 border-t-2 border-[#D81B60]" />
          <span className="pointer-events-none absolute bottom-9 left-4 h-5 w-5 rounded-bl border-b-2 border-l-2 border-[#D81B60]" />
          <span className="pointer-events-none absolute bottom-9 right-4 h-5 w-5 rounded-br border-b-2 border-r-2 border-[#D81B60]" />

          {/* Línea láser central */}
          <div className="pointer-events-none absolute left-3 right-3 top-1/2 h-[2px] -translate-y-2 bg-gradient-to-r from-transparent via-[#FF1744] to-transparent shadow-[0_0_12px_#FF1744]" />

          {/* Barra inferior de estado de cámara */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-black/80 px-3 py-1.5 text-[11px] font-semibold text-gray-300">
            <span
              className={`h-2 w-2 rounded-full ${
                cameraActive
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-emerald-500/80 animate-pulse'
              }`}
            />
            <span>{cameraStatus}</span>
          </div>
        </div>

        {/* Botones secundarios debajo del visor: Reactivar Cámara y Subir Archivo QR */}
        <div className="mb-3.5 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => void startCamera()}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#1E1E1E] py-2 text-xs font-bold text-gray-200 transition hover:border-white/30 hover:bg-white/10"
          >
            <i className="fa-solid fa-camera text-gray-400" />
            Reactivar Cámara
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#1E1E1E] py-2 text-xs font-bold text-gray-200 transition hover:border-white/30 hover:bg-white/10"
          >
            <i className="fa-solid fa-folder-open text-amber-400" />
            Subir Archivo QR
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleFileUpload(e)}
            className="hidden"
            aria-label="Archivo de imagen QR"
          />
        </div>

        {/* Selector rápido de pre-órdenes activas (si existen en BD) */}
        {preordenesActivas.length > 0 && (
          <div className="mb-3.5 rounded-lg border border-white/10 bg-black/40 p-2.5">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Pre-órdenes activas recientes (vigencia ≤ 12 días):
            </div>
            <div className="flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
              {preordenesActivas.slice(0, 6).map((pre) => (
                <button
                  key={pre.codigo}
                  type="button"
                  onClick={() => setCodigo(pre.codigo)}
                  className="rounded border border-[#D81B60]/40 bg-[#D81B60]/10 px-2 py-1 text-[11px] font-bold text-pink-200 transition hover:bg-[#D81B60]/25"
                >
                  {pre.codigo} • {pre.cliente} (${pre.total})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alerta de rechazo si el QR expiró (> 12 días) o ya fue canjeado */}
        {mensajeError && (
          <div
            role="alert"
            className="mb-3.5 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-center text-xs font-semibold text-red-300"
          >
            <i className="fa-solid fa-triangle-exclamation mr-1.5" />
            {mensajeError}
          </div>
        )}

        {/* Formulario de lectura / escritura manual */}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            aria-label="Escribir o escanear folio"
            placeholder="ESCANEAR O ESCRIBIR CÓDIGO (EJ: PRE-XIL-84920)..."
            autoFocus
            className="w-full rounded-xl border border-white/15 bg-[#0B0B0B] px-4 py-3 text-center text-xs font-extrabold uppercase tracking-wider text-white placeholder-gray-500 focus:border-[#D81B60] focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading || !codigo.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#AD1457] py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_6px_20px_rgba(216,27,96,0.35)] transition hover:bg-[#D81B60] disabled:opacity-50"
          >
            <i className="fa-solid fa-circle-check" />
            {loading ? 'VALIDANDO...' : 'VALIDAR Y CARGAR EN CAJA'}
          </button>
        </form>
      </div>
    </div>
  );
}

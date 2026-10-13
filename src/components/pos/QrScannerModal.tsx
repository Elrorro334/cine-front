'use client';

import { useState } from 'react';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (codigo: string) => void;
}

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const [inputCode, setInputCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onScanSuccess(inputCode.trim().toUpperCase());
    setInputCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
      <div className="bg-[#111111] border-2 border-[#D81B60] rounded-2xl max-w-lg w-full p-4 sm:p-6 text-center relative shadow-2xl">
        <button onClick={onClose} className="absolute top-3 right-3 text-[#a3a3a3] hover:text-white">
          <i className="fa-solid fa-xmark text-lg" />
        </button>

        <span className="bg-[#D81B60] text-white text-[9px] font-bold uppercase tracking-widest px-3 py-0.5 rounded-full inline-block mb-2">
          Hardware / Escáner de Pre-orden
        </span>
        <h3 className="text-base sm:text-xl font-['Playfair_Display',serif] font-black uppercase text-white mb-1">
          Lectura de Código QR
        </h3>
        <p className="text-[10px] text-[#a3a3a3] mb-4">
          Ingresa el folio o escanea el ticket digital
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Escribir o escanear folio (Ej: PRE-XIL-84920)..."
            className="w-full bg-[#050505] text-white px-4 py-3 rounded-xl border border-[#262626] focus:border-[#D81B60] font-mono text-xs uppercase text-center font-bold outline-none"
          />
          <button
            type="submit"
            className="w-full bg-[#D81B60] hover:bg-pink-600 text-white font-bold text-xs uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg"
          >
            Validar y Cargar en Caja
          </button>
        </form>
      </div>
    </div>
  );
}
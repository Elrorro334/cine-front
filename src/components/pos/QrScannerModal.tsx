'use client';

import { useState } from 'react';

type QrScannerModalProps = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (codigo: string) => void;
}>;

export default function QrScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: QrScannerModalProps) {
  const [inputCode, setInputCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onScanSuccess(inputCode.trim().toUpperCase());
    setInputCode('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
      <div className="bg-[#111111] border-2 border-[#D81B60] rounded-2xl max-w-lg w-full p-6 text-center relative">
        <button type="button" onClick={onClose} className="absolute top-3 right-3 text-[#a3a3a3] hover:text-white"><i className="fa-solid fa-xmark text-lg" /></button>
        <h3 className="text-lg font-black uppercase text-white mb-2">Lectura de Código QR</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Escribir o escanear folio..."
            className="w-full bg-[#050505] text-white px-4 py-3 rounded-xl border border-[#262626] font-mono text-xs uppercase text-center font-bold"
          />
          <button type="submit" className="w-full bg-[#D81B60] text-white font-bold text-xs uppercase py-3 rounded-xl">
            Validar e Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
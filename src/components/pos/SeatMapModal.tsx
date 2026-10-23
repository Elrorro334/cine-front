'use client';

import { useState, useEffect } from 'react';
import { taquillaService } from '@/services/taquillaService';
import { ButacaDto } from '@/types/api';

interface SeatMapModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly peliculaTitle: string;
  readonly horario: string;
  readonly idFuncion?: number;
  readonly precioBoleto?: number;
  readonly onConfirmSeats: (asientos: string[]) => void;
}

function getSeatButtonStyle(isOcupado: boolean, isSelected: boolean): string {
  if (isOcupado) {
    return 'bg-red-950/40 text-red-700 border border-red-900/40 cursor-not-allowed opacity-50';
  }
  if (isSelected) {
    return 'bg-[#D81B60] text-white border border-pink-400 scale-105 shadow-[0_0_10px_rgba(216,27,96,0.8)]';
  }
  return 'bg-[#050505] text-[#a3a3a3] hover:text-white border border-[#262626] hover:border-[#D81B60]';
}

export default function SeatMapModal({
  isOpen,
  onClose,
  peliculaTitle,
  horario,
  idFuncion,
  precioBoleto = 50,
  onConfirmSeats,
}: SeatMapModalProps) {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [butacas, setButacas] = useState<ButacaDto[]>([]);
  const [nombreSala, setNombreSala] = useState<string>('Sala 1');
  const [precioReal, setPrecioReal] = useState<number>(precioBoleto);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !idFuncion) return;

    let isMounted = true;
    setSelectedSeats([]);
    setLoading(true);

    async function loadButacas() {
      try {
        const data = await taquillaService.getButacasFuncion(idFuncion!);
        if (isMounted) {
          setButacas(data.butacas || []);
          setNombreSala(data.nombreSala || 'Sala 1');
          setPrecioReal(data.precio || precioBoleto);
        }
      } catch (err) {
        console.error('Error cargando butacas:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadButacas();

    return () => {
      isMounted = false;
    };
  }, [isOpen, idFuncion, precioBoleto]);

  if (!isOpen) return null;

  // Filas únicas derivadas directamente de la base de datos
  const filas = Array.from(new Set(butacas.map((b) => b.fila))).sort((a, b) => a.localeCompare(b));

  const toggleAsiento = (asientoCodigo: string, estaOcupada: boolean) => {
    if (estaOcupada) return;

    if (selectedSeats.includes(asientoCodigo)) {
      setSelectedSeats(selectedSeats.filter((a) => a !== asientoCodigo));
    } else {
      if (selectedSeats.length >= 8) {
        alert('Máximo 8 boletos por selección.');
        return;
      }
      setSelectedSeats([...selectedSeats, asientoCodigo]);
    }
  };

  const autoAsignar = () => {
    const primeraLibre = butacas.find((b) => !b.estaOcupada && !selectedSeats.includes(b.codigo));
    if (primeraLibre) {
      setSelectedSeats([primeraLibre.codigo]);
    }
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0) return;
    onConfirmSeats(selectedSeats);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/90 backdrop-blur-md">
      <div className="bg-[#111111] border border-[#262626] rounded-2xl max-w-xl w-full p-4 sm:p-6 shadow-2xl flex flex-col">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-chair text-[#D81B60] text-lg" />
            <div>
              <h3 className="font-['Playfair_Display',serif] font-black uppercase text-white text-sm">
                {peliculaTitle}
              </h3>
              <p className="text-[10px] text-[#a3a3a3] font-mono">
                {nombreSala} ({butacas.length} Butacas) • Función {horario.substring(0, 5)}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar selector de butacas" className="text-[#a3a3a3] hover:text-white">
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>

        {/* Representación Pantalla Curva */}
        <div className="my-4 text-center">
          <div className="w-3/4 mx-auto h-2 bg-gradient-to-r from-transparent via-[#D81B60] to-transparent rounded-full shadow-[0_0_15px_rgba(216,27,96,0.8)] mb-1" />
          <span className="text-[9px] uppercase font-mono font-bold tracking-[0.25em] text-[#a3a3a3]">
            PANTALLA {nombreSala.toUpperCase()} (CURVED SCREEN)
          </span>
        </div>

        {/* Leyendas */}
        <div className="flex justify-center gap-4 text-[10px] font-bold uppercase mb-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#050505] border border-[#262626]" />
            <span className="text-[#a3a3a3]">Libre</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#D81B60] border border-pink-400" />
            <span className="text-white">Seleccionada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-950 border border-red-900" />
            <span className="text-red-400">Ocupada</span>
          </div>
        </div>

        {/* Matriz Dinámica desde Base de Datos */}
        {loading ? (
          <div className="py-12 text-center text-xs text-[#a3a3a3] font-mono">
            <i className="fa-solid fa-spinner fa-spin text-lg text-[#D81B60] block mb-2" />
            <p>Consultando disponibilidad en tiempo real...</p>
          </div>
        ) : (
          <div className="bg-[#050505] p-3 rounded-2xl border border-[#262626] flex flex-col gap-2 items-center">
            {filas.map((fila) => {
              const butacasFila = butacas.filter((b) => b.fila === fila).sort((a, b) => a.numero - b.numero);
              return (
                <div key={fila} className="flex items-center gap-1.5">
                  <span className="w-4 text-center font-mono font-bold text-xs text-[#a3a3a3]">
                    {fila}
                  </span>
                  <div className="flex gap-1">
                    {butacasFila.map((b) => {
                      const isOcupado = b.estaOcupada;
                      const isSelected = selectedSeats.includes(b.codigo);

                      return (
                        <button
                          key={b.codigo}
                          type="button"
                          disabled={isOcupado}
                          onClick={() => toggleAsiento(b.codigo, isOcupado)}
                          className={`w-6 h-6 rounded font-mono text-[9px] font-bold transition-all ${getSeatButtonStyle(isOcupado, isSelected)}`}
                        >
                          {b.numero}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Subtotal y Botones */}
        <div className="mt-4 pt-3 border-t border-[#262626] flex flex-col gap-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#a3a3a3] font-bold uppercase">Butacas Elegidas:</span>
            <span className="font-mono font-black text-[#D81B60]">
              {selectedSeats.length > 0 ? selectedSeats.join(', ') : 'Ninguna'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-[#a3a3a3] font-bold uppercase">Subtotal Boletos:</span>
            <span className="font-mono font-black text-white text-sm">
              ${selectedSeats.length * precioReal}.00
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={autoAsignar}
              className="bg-[#050505] hover:bg-neutral-800 text-[#a3a3a3] hover:text-white border border-[#262626] py-2.5 px-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-bolt text-yellow-400 text-xs" />
              <span>Asignar Auto (1)</span>
            </button>
            <button
              type="button"
              disabled={selectedSeats.length === 0}
              onClick={handleConfirm}
              className="bg-[#D81B60] hover:bg-pink-600 disabled:opacity-40 text-white py-2.5 px-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-check text-xs" />
              <span>Agregar a Venta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

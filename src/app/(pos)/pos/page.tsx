'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { taquillaService } from '@/services/taquillaService';
import { PeliculaCarteleraDto } from '@/types/api';

import SeatMapModal from '@/components/pos/SeatMapModal';
import QrScannerModal from '@/components/pos/QrScannerModal';
import ThermalTicketModal from '@/components/pos/ThermalTicketModal';

interface CartItem {
  id: string;
  tipo: 'boleto' | 'dulceria';
  nombre: string;
  precio: number;
  cantidad: number;
  metadata?: {
    peliId?: number;
    horario?: string;
    asientos?: string[];
  };
}

export default function PosPage() {
  const router = useRouter();

  const [reloj, setReloj] = useState<string>('--:--');
  const [pasoActual, setPasoActual] = useState<number>(1);

  const [cartelera, setCartelera] = useState<PeliculaCarteleraDto[]>([]);
  const [loadingCartelera, setLoadingCartelera] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');

  const [carrito, setCarrito] = useState<CartItem[]>([]);

  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);

  const [selectedPeli, setSelectedPeli] = useState<PeliculaCarteleraDto | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string>('');

  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta Mercado Pago'>('Efectivo');
  const [ticketFolio, setTicketFolio] = useState<string>('');

  useEffect(() => {
    const session = authService.getUserSession();
    if (!session) {
      router.push('/');
      return;
    }
    void fetchCartelera();

    const interval = setInterval(() => {
      setReloj(
        new Date().toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [router]);

  const fetchCartelera = async (term?: string) => {
    try {
      setLoadingCartelera(true);
      const data = await taquillaService.getCartelera(term);
      setCartelera(data);
    } catch (error: any) {
      if (error?.status === 401) {
        authService.logout();
        router.push('/');
      }
    } finally {
      setLoadingCartelera(false);
    }
  };

  const totalGeneral = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const agregarAlCarrito = (
    id: string,
    tipo: 'boleto' | 'dulceria',
    nombre: string,
    precio: number,
    cantidad = 1,
    metadata = {}
  ) => {
    setCarrito((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx > -1) {
        const copy = [...prev];
        copy[idx].cantidad += cantidad;
        return copy;
      }
      return [...prev, { id, tipo, nombre, precio, cantidad, metadata }];
    });
  };

  const openSeatModal = (pelicula: PeliculaCarteleraDto, funcionHora: string) => {
    setSelectedPeli(pelicula);
    setSelectedHorario(funcionHora);
    setIsSeatModalOpen(true);
  };

  const handleSeatsConfirmed = (asientos: string[]) => {
    if (!selectedPeli) return;
    const idUnico = `bol_${selectedPeli.idPelicula}_${Date.now()}`;

    agregarAlCarrito(
      idUnico,
      'boleto',
      `${selectedPeli.titulo} (${selectedHorario.substring(0, 5)})`,
      50,
      asientos.length,
      {
        peliId: selectedPeli.idPelicula,
        horario: selectedHorario,
        asientos,
      }
    );
  };

  const handleQrSuccess = (codigo: string) => {
    agregarAlCarrito(`pre_${codigo}`, 'boleto', `Pre-orden ${codigo}`, 100, 1);
    setPasoActual(3);
  };

  const generarFolioSeguro = (): string => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const numero = (array[0] % 9000) + 1000;
    return `VT-${numero}`;
  };

  const finalizarVenta = (metodo: 'Efectivo' | 'Tarjeta Mercado Pago') => {
    setMetodoPago(metodo);
    setTicketFolio(generarFolioSeguro());
    setIsTicketModalOpen(true);
  };

  const resetVenta = () => {
    setCarrito([]);
    setPasoActual(1);
    setIsTicketModalOpen(false);
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <div className="bg-[#0a0a0a] text-[#f3f4f6] min-h-screen h-screen flex flex-col font-['Montserrat',sans-serif]">
        
        <header className="bg-[#111111] border-b border-[#262626] px-4 py-2.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-black uppercase text-white">Xilotzin POS</h1>
            <span className="text-[9px] font-bold text-[#a3a3a3] font-mono">{reloj}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="bg-[#D81B60]/20 text-white border border-[#D81B60] px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
            >
              Escanear QR
            </button>
            <button
              type="button"
              onClick={() => {
                authService.logout();
                router.push('/');
              }}
              className="bg-[#111111] text-[#a3a3a3] border border-[#262626] px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
            >
              Salir
            </button>
          </div>
        </header>

        <main className="flex-grow flex overflow-hidden">
          <section className="w-full lg:w-2/3 bg-[#0a0a0a] p-4 space-y-4 overflow-y-auto">
            {pasoActual === 1 && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    void fetchCartelera(e.target.value);
                  }}
                  placeholder="Buscar película..."
                  className="w-full bg-[#050505] text-white px-3 py-2 text-xs rounded-lg border border-[#262626]"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingCartelera ? (
                    <p className="text-center text-[#a3a3a3]">Cargando...</p>
                  ) : (
                    cartelera.map((pelicula) => (
                      <div key={pelicula.idPelicula} className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3">
                        <h3 className="font-black uppercase text-white text-sm">{pelicula.titulo}</h3>
                        <div className="flex flex-wrap gap-2">
                          {pelicula.funciones.map((funcion) => (
                            <button
                              key={funcion.idFuncion}
                              type="button"
                              onClick={() => openSeatModal(pelicula, funcion.hora)}
                              className="bg-[#050505] text-white px-3 py-1.5 rounded border border-[#262626] text-xs font-mono font-bold"
                            >
                              {funcion.hora.substring(0, 5)}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {pasoActual === 2 && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'palomitas_g', nombre: 'Palomitas Grandes', precio: 75 },
                  { id: 'refresco_g', nombre: 'Refresco Grande 1L', precio: 55 },
                ].map((snack) => (
                  <button
                    key={snack.id}
                    type="button"
                    onClick={() => agregarAlCarrito(`snk_${snack.id}`, 'dulceria', snack.nombre, snack.precio)}
                    className="bg-[#111111] border border-[#262626] rounded-xl p-4 text-center cursor-pointer"
                  >
                    <h3 className="font-bold text-white uppercase text-xs">{snack.nombre}</h3>
                    <p className="text-xs font-black text-[#F57C00] font-mono mt-1">${snack.precio}</p>
                  </button>
                ))}
              </div>
            )}

            {pasoActual === 3 && (
              <div className="bg-[#111111] border border-[#262626] rounded-2xl p-6 text-center max-w-md mx-auto my-auto space-y-4">
                <h2 className="text-xs font-bold uppercase text-[#a3a3a3]">Monto Total a Cobrar</h2>
                <p className="text-4xl font-black text-white font-mono">${totalGeneral}</p>
                <button
                  type="button"
                  onClick={() => finalizarVenta('Efectivo')}
                  className="w-full bg-green-700 text-white font-black py-3 rounded-xl uppercase text-xs"
                >
                  Confirmar Pago en Efectivo
                </button>
              </div>
            )}
          </section>

          <aside className="w-1/3 bg-[#111111] border-l border-[#262626] p-4 flex flex-col justify-between">
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase text-white">Resumen de Venta</h2>
              {carrito.map((item) => (
                <div key={item.id} className="bg-[#050505] border border-[#262626] p-2.5 rounded-lg flex justify-between text-xs">
                  <div>
                    <p className="font-bold text-white">{item.nombre}</p>
                    <p className="text-[10px] text-[#a3a3a3]">${item.precio} x {item.cantidad}</p>
                  </div>
                  <p className="font-black font-mono text-white">${item.precio * item.cantidad}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-[#262626] pt-3">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-xs font-bold text-[#a3a3a3] uppercase">TOTAL</span>
                <span className="text-3xl font-black text-white font-mono">${totalGeneral}</span>
              </div>
              <button
                type="button"
                disabled={carrito.length === 0}
                onClick={() => setPasoActual(3)}
                className="w-full bg-[#D81B60] text-white py-3 rounded-xl font-black text-xs uppercase disabled:opacity-40"
              >
                Paso 3: Cobrar
              </button>
            </div>
          </aside>
        </main>

        <SeatMapModal
          isOpen={isSeatModalOpen}
          onClose={() => setIsSeatModalOpen(false)}
          peliculaTitle={selectedPeli?.titulo || ''}
          horario={selectedHorario}
          onConfirmSeats={handleSeatsConfirmed}
        />

        <QrScannerModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onScanSuccess={handleQrSuccess}
        />

        <ThermalTicketModal
          isOpen={isTicketModalOpen}
          folio={ticketFolio}
          items={carrito.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio }))}
          total={totalGeneral}
          metodoPago={metodoPago}
          onNewSale={resetVenta}
        />
      </div>
    </>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { taquillaService } from '@/services/taquillaService';
import { PeliculaCarteleraDto, FuncionHorarioDto } from '@/types/api';

// Importación de Componentes Modulares Reutilizables
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

  // Estados Globales de Vista
  const [userSession, setUserSession] = useState<{ nombre: string; rol: string } | null>(null);
  const [reloj, setReloj] = useState<string>('--:--');
  const [pasoActual, setPasoActual] = useState<number>(1);

  // Cartelera y Filtros (HU-05)
  const [cartelera, setCartelera] = useState<PeliculaCarteleraDto[]>([]);
  const [loadingCartelera, setLoadingCartelera] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');

  // Carrito y Drawer Móvil
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [mobileCartOpen, setMobileCartOpen] = useState<boolean>(false);

  // Estados de Modales
  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);

  // Contexto de Selección
  const [selectedPeli, setSelectedPeli] = useState<PeliculaCarteleraDto | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string>('');

  // Cobro
  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TARJETA' | null>(null);
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>('');
  const [folioTarjeta, setFolioTarjeta] = useState<string>('');
  const [ticketFolio, setTicketFolio] = useState<string>('');

  useEffect(() => {
    const session = authService.getUserSession();
    if (!session) {
      router.push('/');
      return;
    }
    setUserSession(session);
    fetchCartelera();

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
  const totalArticulos = carrito.reduce((sum, item) => sum + item.cantidad, 0);

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

  const finalizarVenta = (metodo: 'Efectivo' | 'Tarjeta Mercado Pago') => {
    setTicketFolio(`VT-${Math.floor(1000 + Math.random() * 9000)}`);
    setIsTicketModalOpen(true);
  };

  const resetVenta = () => {
    setCarrito([]);
    setPasoActual(1);
    setMetodoPago(null);
    setEfectivoRecibido('');
    setFolioTarjeta('');
    setIsTicketModalOpen(false);
  };

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <link
        href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;900&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Space+Mono:wght@400;700&display=swap"
        rel="stylesheet"
      />

      <div className="bg-[#0a0a0a] text-[#f3f4f6] antialiased min-h-screen h-screen flex flex-col overflow-hidden font-['Montserrat',sans-serif]">
        
        {/* Header POS */}
        <header className="bg-[#111111] border-b border-[#262626] px-4 py-2.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-[#D81B60]/15 p-2 rounded-xl border border-[#D81B60]/40">
              <i className="fa-solid fa-cash-register text-[#D81B60] text-lg" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase text-white tracking-widest leading-none">
                Xilotzin POS
              </h1>
              <p className="text-[9px] font-bold text-[#a3a3a3] mt-0.5 font-mono">{reloj}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="bg-[#D81B60]/20 text-white border border-[#D81B60] hover:bg-[#D81B60] px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-1.5"
            >
              <i className="fa-solid fa-qrcode" />
              <span>Escanear QR</span>
            </button>
            <button
              onClick={() => {
                authService.logout();
                router.push('/');
              }}
              className="bg-[#111111] text-[#a3a3a3] hover:text-white border border-[#262626] px-3 py-1.5 rounded-lg text-xs font-bold uppercase"
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
            </button>
          </div>
        </header>

        {/* Wizard Navigation */}
        <div className="bg-[#111111]/80 border-b border-[#262626] px-6 py-2 flex justify-between items-center shrink-0">
          <div className="flex gap-6 text-xs font-bold">
            <button
              onClick={() => setPasoActual(1)}
              className={`py-1 uppercase tracking-wider flex items-center gap-1.5 ${
                pasoActual === 1 ? 'text-white border-b-2 border-[#D81B60]' : 'text-[#a3a3a3]'
              }`}
            >
              <i className="fa-solid fa-ticket text-[#D81B60]" />
              <span>1. Boletaje</span>
            </button>
            <button
              onClick={() => setPasoActual(2)}
              className={`py-1 uppercase tracking-wider flex items-center gap-1.5 ${
                pasoActual === 2 ? 'text-white border-b-2 border-[#D81B60]' : 'text-[#a3a3a3]'
              }`}
            >
              <i className="fa-solid fa-cookie-bite text-[#F57C00]" />
              <span>2. Dulcería & Combos</span>
            </button>
            <button
              onClick={() => {
                if (carrito.length > 0) setPasoActual(3);
              }}
              className={`py-1 uppercase tracking-wider flex items-center gap-1.5 ${
                pasoActual === 3 ? 'text-white border-b-2 border-[#D81B60]' : 'text-[#a3a3a3]'
              }`}
            >
              <i className="fa-solid fa-credit-card text-[#0288D1]" />
              <span>3. Cobro & Ticket</span>
            </button>
          </div>
        </div>

        {/* Área Principal */}
        <main className="flex-grow flex overflow-hidden">
          <section className="w-full lg:w-2/3 bg-[#0a0a0a] flex flex-col h-full overflow-y-auto p-4 space-y-4">
            
            {pasoActual === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-3 text-[#a3a3a3] text-xs" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      fetchCartelera(e.target.value);
                    }}
                    placeholder="Buscar película..."
                    className="w-full bg-[#050505] text-white pl-9 pr-3 py-2 text-xs rounded-lg border border-[#262626] focus:border-[#D81B60] outline-none uppercase font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingCartelera ? (
                    <div className="col-span-full py-10 text-center text-[#a3a3a3]">
                      <i className="fa-solid fa-spinner fa-spin text-2xl text-[#D81B60]" />
                    </div>
                  ) : (
                    cartelera.map((pelicula) => (
                      <div
                        key={pelicula.idPelicula}
                        className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3"
                      >
                        <div className="flex gap-3">
                          <div className="w-16 h-24 bg-[#050505] rounded border border-[#262626] overflow-hidden flex items-center justify-center">
                            {pelicula.poster_image ? (
                              <img src={pelicula.poster_image} alt={pelicula.titulo} className="w-full h-full object-cover" />
                            ) : (
                              <i className="fa-solid fa-film text-[#a3a3a3]/40 text-xl" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-['Playfair_Display',serif] font-black uppercase text-white text-sm">
                              {pelicula.titulo}
                            </h3>
                            <p className="text-[10px] text-[#D81B60] font-bold uppercase">{pelicula.clasificacion || 'GENERAL'}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#262626]">
                          {pelicula.funciones.map((funcion) => (
                            <button
                              key={funcion.idFuncion}
                              onClick={() => openSeatModal(pelicula, funcion.hora)}
                              className="bg-[#050505] hover:bg-[#D81B60] text-white px-3 py-1.5 rounded border border-[#262626] text-xs font-mono font-bold flex items-center gap-1.5"
                            >
                              <i className="fa-solid fa-chair text-[10px]" />
                              <span>{funcion.hora.substring(0, 5)}</span>
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
              <div className="space-y-4">
                <h2 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-2">
                  <i className="fa-solid fa-cookie-bite text-[#F57C00]" /> Catálogo de Snacks
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'palomitas_g', nombre: 'Palomitas Grandes', precio: 75, icon: 'fa-box-open' },
                    { id: 'refresco_g', nombre: 'Refresco Grande 1L', precio: 55, icon: 'fa-bottle-water' },
                  ].map((snack) => (
                    <div
                      key={snack.id}
                      onClick={() => agregarAlCarrito(`snk_${snack.id}`, 'dulceria', snack.nombre, snack.precio)}
                      className="bg-[#111111] border border-[#262626] hover:border-[#F57C00] rounded-xl p-4 text-center cursor-pointer transition-all"
                    >
                      <i className={`fa-solid ${snack.icon} text-2xl text-[#F57C00] mb-2`} />
                      <h3 className="font-bold text-white uppercase text-xs">{snack.nombre}</h3>
                      <p className="text-xs font-black text-[#F57C00] font-mono mt-1">${snack.precio}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pasoActual === 3 && (
              <div className="bg-[#111111] border border-[#262626] rounded-2xl p-6 text-center max-w-md mx-auto my-auto space-y-4">
                <h2 className="text-xs font-bold uppercase text-[#a3a3a3]">Monto Total a Cobrar</h2>
                <p className="text-4xl font-black text-white font-mono">${totalGeneral}</p>
                <button
                  onClick={() => finalizarVenta('Efectivo')}
                  className="w-full bg-gradient-to-r from-green-700 to-green-600 text-white font-black py-3 rounded-xl uppercase text-xs tracking-wider"
                >
                  Confirmar Pago en Efectivo
                </button>
              </div>
            )}

          </section>

          {/* Resumen de Venta Lateral */}
          <aside className="w-1/3 bg-[#111111] border-l border-[#262626] p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-xs font-black uppercase text-white mb-4 flex items-center gap-2">
                <i className="fa-solid fa-cart-shopping text-[#D81B60]" /> Resumen de Venta
              </h2>
              <div className="space-y-2">
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
            </div>

            <div className="border-t border-[#262626] pt-3">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-xs font-bold text-[#a3a3a3] uppercase">TOTAL</span>
                <span className="text-3xl font-black text-white font-mono">${totalGeneral}</span>
              </div>
              <button
                disabled={carrito.length === 0}
                onClick={() => setPasoActual(3)}
                className="w-full bg-[#D81B60] hover:bg-pink-600 disabled:opacity-40 text-white py-3 rounded-xl font-black text-xs uppercase"
              >
                Paso 3: Cobrar
              </button>
            </div>
          </aside>
        </main>

        {/* Componentes Modulares invocados limpiamente */}
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
          metodoPago={metodoPago || 'Efectivo'}
          onNewSale={resetVenta}
        />

      </div>
    </>
  );
}
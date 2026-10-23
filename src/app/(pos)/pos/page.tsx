'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { taquillaService } from '@/services/taquillaService';
import {
  PeliculaCarteleraDto,
  FuncionHorarioDto,
  ProductoDto,
  RegistrarVentaDto,
} from '@/types/api';

import SeatMapModal from '@/components/pos/SeatMapModal';
import QrScannerModal from '@/components/pos/QrScannerModal';
import ThermalTicketModal from '@/components/pos/ThermalTicketModal';
import TmdbRegisterModal from '@/components/pos/TmdbRegisterModal';

interface CartItem {
  id: string;
  tipo: 'boleto' | 'dulceria';
  nombre: string;
  precio: number;
  cantidad: number;
  metadata?: {
    idProducto?: number;
    idFuncion?: number;
    peliId?: number;
    horario?: string;
    sku?: string;
    asientos?: string[];
  };
}

export default function PosPage() {
  const router = useRouter();

  const [reloj, setReloj] = useState<string>('--:--');
  const [pasoActual, setPasoActual] = useState<number>(1);

  // Cartelera dinámica desde BD
  const [cartelera, setCartelera] = useState<PeliculaCarteleraDto[]>([]);
  const [loadingCartelera, setLoadingCartelera] = useState<boolean>(true);
  const [busqueda, setBusqueda] = useState<string>('');

  // Dulcería e inventario dinámicos desde BD
  const [dulceria, setDulceria] = useState<ProductoDto[]>([]);
  const [loadingDulceria, setLoadingDulceria] = useState<boolean>(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');

  const [carrito, setCarrito] = useState<CartItem[]>([]);

  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);
  const [isTmdbModalOpen, setIsTmdbModalOpen] = useState<boolean>(false);

  const [selectedPeli, setSelectedPeli] = useState<PeliculaCarteleraDto | null>(null);
  const [selectedFuncion, setSelectedFuncion] = useState<FuncionHorarioDto | null>(null);

  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta Mercado Pago'>('Efectivo');
  const [ticketFolio, setTicketFolio] = useState<string>('');
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);
  const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

  const fetchCartelera = useCallback(async (term?: string) => {
    try {
      setLoadingCartelera(true);
      const data = await taquillaService.getCartelera(term);
      setCartelera(data);
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error?.status === 401) {
        authService.logout();
        router.push('/');
      }
    } finally {
      setLoadingCartelera(false);
    }
  }, [router]);

  const fetchDulceria = useCallback(async () => {
    try {
      setLoadingDulceria(true);
      const data = await taquillaService.getProductosDulceria();
      setDulceria(data);
    } catch (err) {
      console.error('Error cargando catálogo de dulcería:', err);
    } finally {
      setLoadingDulceria(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const session = authService.getUserSession();
    if (!session) {
      router.push('/');
      return;
    }

    void fetchCartelera();
    void fetchDulceria();

    const interval = setInterval(() => {
      if (isMounted) {
        setReloj(
          new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        );
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [router, fetchCartelera, fetchDulceria]);

  const totalGeneral = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  const agregarAlCarrito = (
    id: string,
    tipo: 'boleto' | 'dulceria',
    nombre: string,
    precio: number,
    cantidad = 1,
    metadata: CartItem['metadata'] = {}
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

  const eliminarDelCarrito = (id: string) => {
    setCarrito((prev) => prev.filter((i) => i.id !== id));
  };

  const openSeatModal = (pelicula: PeliculaCarteleraDto, funcion: FuncionHorarioDto) => {
    setSelectedPeli(pelicula);
    setSelectedFuncion(funcion);
    setIsSeatModalOpen(true);
  };

  const handleSeatsConfirmed = (asientos: string[]) => {
    if (!selectedPeli || !selectedFuncion) return;
    const idUnico = `bol_${selectedFuncion.idFuncion}_${Date.now()}`;

    agregarAlCarrito(
      idUnico,
      'boleto',
      `${selectedPeli.titulo} (${selectedFuncion.hora.substring(0, 5)})`,
      selectedFuncion.precio || 50,
      asientos.length,
      {
        peliId: selectedPeli.idPelicula,
        idFuncion: selectedFuncion.idFuncion,
        horario: selectedFuncion.hora,
        sku: 'BOL-GEN',
        asientos,
      }
    );
  };

  const handleQrSuccess = async (codigo: string) => {
    try {
      const pre = await taquillaService.getPreorden(codigo);
      if (!pre) {
        alert('Código QR no encontrado en base de datos.');
        return;
      }

      // Agregar boletos de la pre-orden
      if (pre.boletosGeneral > 0) {
        agregarAlCarrito(
          `pre_bol_${pre.codigo}`,
          'boleto',
          `${pre.pelicula} (${pre.horario}) - ${pre.cliente}`,
          pre.precioBoleto,
          pre.boletosGeneral,
          {
            idFuncion: pre.idFuncion,
            sku: 'BOL-GEN',
            asientos: pre.asientos,
          }
        );
      }

      // Agregar combos de la pre-orden
      pre.combos.forEach((combo) => {
        agregarAlCarrito(
          `pre_cmb_${combo.nombre}_${Date.now()}`,
          'dulceria',
          combo.nombre,
          combo.precio,
          combo.cantidad
        );
      });

      setPasoActual(3);
    } catch {
      alert('Error al validar la pre-orden desde SQL Server.');
    }
  };

  const finalizarVenta = async (metodo: 'Efectivo' | 'Tarjeta Mercado Pago') => {
    if (carrito.length === 0) return;

    try {
      setIsProcessingSale(true);
      setMetodoPago(metodo);

      const session = authService.getUserSession();
      const payload: RegistrarVentaDto = {
        idVendedor: session?.idVendedor || 1,
        metodoPago: metodo,
        items: carrito.map((item) => ({
          idProducto: item.metadata?.idProducto,
          idFuncion: item.metadata?.idFuncion,
          sku: item.metadata?.sku || '',
          nombre: item.nombre,
          tipo: item.tipo,
          cantidad: item.cantidad,
          precio: item.precio,
          asientos: item.metadata?.asientos,
        })),
      };

      const resultado = await taquillaService.registrarVenta(payload);
      setTicketFolio(resultado.folio);
      setIsTicketModalOpen(true);

      // Refrescar inventario y funciones en tiempo real
      void fetchCartelera();
      void fetchDulceria();
    } catch (err) {
      console.error('Error registrando venta:', err);
      setMensajeFeedback('Error al procesar la venta en la base de datos.');
    } finally {
      setIsProcessingSale(false);
    }
  };

  const resetVenta = () => {
    setCarrito([]);
    setPasoActual(1);
    setIsTicketModalOpen(false);
    setMensajeFeedback(null);
  };

  // Categorías únicas disponibles en el catálogo de dulcería de la BD
  const categoriasDulceria = ['Todas', ...Array.from(new Set(dulceria.map((p) => p.categoria)))];

  const productosFiltrados = categoriaSeleccionada === 'Todas'
    ? dulceria
    : dulceria.filter((p) => p.categoria === categoriaSeleccionada);

  return (
    <>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
      <div className="bg-[#0a0a0a] text-[#f3f4f6] min-h-screen h-screen flex flex-col font-['Montserrat',sans-serif]">
        
        {/* Header POS */}
        <header className="bg-[#111111] border-b border-[#262626] px-4 py-2.5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
              <i className="fa-solid fa-cash-register text-[#D81B60]" />
              <span>Xilotzin POS</span>
            </h1>
            <span className="text-[10px] font-bold text-[#a3a3a3] font-mono bg-[#050505] px-2 py-0.5 rounded border border-[#262626]">
              {reloj}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsTmdbModalOpen(true)}
              className="bg-[#E11D2F] hover:bg-[#c81928] text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition shadow"
            >
              <i className="fa-solid fa-film text-xs" />
              <span>+ Película (TMDB)</span>
            </button>
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="bg-[#D81B60]/20 hover:bg-[#D81B60]/30 text-white border border-[#D81B60] px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition"
            >
              <i className="fa-solid fa-qrcode text-xs" />
              <span>Escanear QR</span>
            </button>
            <button
              type="button"
              onClick={() => {
                authService.logout();
                router.push('/');
              }}
              className="bg-[#111111] hover:bg-neutral-800 text-[#a3a3a3] hover:text-white border border-[#262626] px-3 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-1.5 transition"
            >
              <i className="fa-solid fa-arrow-right-from-bracket text-xs" />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Barra de Navegación de Pasos POS */}
        <nav className="bg-[#141414] border-b border-[#262626] px-4 py-2 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setPasoActual(1)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition ${
              pasoActual === 1
                ? 'bg-[#D81B60] text-white shadow'
                : 'bg-[#050505] text-[#a3a3a3] hover:text-white border border-[#262626]'
            }`}
          >
            <i className="fa-solid fa-ticket text-xs" />
            <span>1. Taquilla / Boletos</span>
          </button>
          <button
            type="button"
            onClick={() => setPasoActual(2)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition ${
              pasoActual === 2
                ? 'bg-[#D81B60] text-white shadow'
                : 'bg-[#050505] text-[#a3a3a3] hover:text-white border border-[#262626]'
            }`}
          >
            <i className="fa-solid fa-popcorn text-xs" />
            <span>2. Dulcería & Combos</span>
          </button>
          <button
            type="button"
            onClick={() => setPasoActual(3)}
            disabled={carrito.length === 0}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition disabled:opacity-40 ${
              pasoActual === 3
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-[#050505] text-[#a3a3a3] hover:text-white border border-[#262626]'
            }`}
          >
            <i className="fa-solid fa-credit-card text-xs" />
            <span>3. Cobro / Finalizar</span>
          </button>
        </nav>

        {/* Feedback Banner */}
        {mensajeFeedback && (
          <div className="bg-red-950/80 border-b border-red-800 text-red-200 text-xs px-4 py-2 flex items-center justify-between">
            <span>{mensajeFeedback}</span>
            <button type="button" onClick={() => setMensajeFeedback(null)} className="text-red-300 font-bold ml-4">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        <main className="flex-grow flex overflow-hidden">
          {/* Panel Izquierdo: Catálogo según Paso Actual */}
          <section className="w-full lg:w-2/3 bg-[#0a0a0a] p-4 space-y-4 overflow-y-auto">
            {/* PASO 1: TAQUILLA */}
            {pasoActual === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-[#737373] text-xs" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      void fetchCartelera(e.target.value);
                    }}
                    placeholder="Buscar película en cartelera activa..."
                    className="w-full bg-[#050505] text-white pl-9 pr-3 py-2 text-xs rounded-lg border border-[#262626] focus:border-[#D81B60] outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadingCartelera && (
                    <div className="col-span-full py-16 text-center text-xs text-[#a3a3a3] font-mono">
                      <i className="fa-solid fa-spinner fa-spin text-xl text-[#D81B60] block mb-2" />
                      <p>Cargando cartelera desde base de datos...</p>
                    </div>
                  )}
                  {!loadingCartelera && cartelera.length === 0 && (
                    <div className="col-span-full py-16 text-center text-xs text-[#a3a3a3]">
                      No hay películas con funciones programadas para hoy.
                    </div>
                  )}
                  {!loadingCartelera && cartelera.length > 0 && (
                    cartelera.map((pelicula) => (
                      <div key={pelicula.idPelicula} className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3 shadow-lg hover:border-[#D81B60]/40 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-black uppercase text-white text-sm leading-tight">{pelicula.titulo}</h3>
                            <p className="text-[10px] text-[#a3a3a3] mt-0.5">
                              Clasif. <span className="text-amber-400 font-bold">{pelicula.clasificacion || 'B'}</span> • {pelicula.duracion || 115} min
                            </p>
                          </div>
                          <span className="text-[9px] bg-neutral-800 text-[#a3a3a3] font-mono px-2 py-0.5 rounded font-bold uppercase">
                            {pelicula.funciones.length} funciones
                          </span>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-[#737373] uppercase mb-1.5">Horarios Disponibles:</p>
                          <div className="flex flex-wrap gap-2">
                            {pelicula.funciones.map((funcion) => (
                              <button
                                key={funcion.idFuncion}
                                type="button"
                                onClick={() => openSeatModal(pelicula, funcion)}
                                className="bg-[#050505] hover:bg-[#D81B60] text-white px-3 py-1.5 rounded-lg border border-[#262626] hover:border-[#D81B60] text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
                              >
                                <i className="fa-solid fa-clock text-[10px]" />
                                <span>{funcion.hora.substring(0, 5)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* PASO 2: DULCERÍA & COMBOS */}
            {pasoActual === 2 && (
              <div className="space-y-4">
                {/* Categorías Chip Picker */}
                <div className="flex flex-wrap gap-2 border-b border-[#262626] pb-3">
                  {categoriasDulceria.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoriaSeleccionada(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition ${
                        categoriaSeleccionada === cat
                          ? 'bg-[#F57C00] text-white shadow'
                          : 'bg-[#111111] text-[#a3a3a3] hover:text-white border border-[#262626]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {loadingDulceria ? (
                  <div className="py-16 text-center text-xs text-[#a3a3a3] font-mono">
                    <i className="fa-solid fa-spinner fa-spin text-xl text-[#F57C00] block mb-2" />
                    <p>Consultando inventario en tiempo real...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {productosFiltrados.map((item) => {
                      const agotado = item.stock <= 0;
                      return (
                        <div
                          key={item.idProducto}
                          className={`bg-[#111111] border border-[#262626] rounded-xl p-3 flex flex-col justify-between transition ${
                            agotado ? 'opacity-50' : 'hover:border-[#F57C00]/50'
                          }`}
                        >
                          {item.img && (
                            <img
                              src={item.img}
                              alt={item.nombre}
                              className="w-full h-24 object-cover rounded-lg mb-2 border border-[#262626]"
                            />
                          )}

                          <div>
                            <div className="flex items-center justify-between text-[10px] text-[#737373] uppercase font-mono mb-1">
                              <span>{item.categoria}</span>
                              <span className={item.stock < 15 ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                                Stock: {item.stock}
                              </span>
                            </div>
                            <h4 className="font-bold text-white uppercase text-xs line-clamp-1">{item.nombre}</h4>
                          </div>

                          <div className="mt-3 pt-2 border-t border-[#262626] flex items-center justify-between">
                            <span className="text-sm font-black text-[#F57C00] font-mono">
                              ${item.precio}.00
                            </span>
                            <button
                              type="button"
                              disabled={agotado}
                              onClick={() =>
                                agregarAlCarrito(
                                  `snk_${item.idProducto}`,
                                  'dulceria',
                                  item.nombre,
                                  item.precio,
                                  1,
                                  {
                                    idProducto: item.idProducto,
                                    sku: item.sku,
                                  }
                                )
                              }
                              className="bg-[#050505] hover:bg-[#F57C00] text-white px-2.5 py-1 rounded-lg border border-[#262626] hover:border-[#F57C00] text-xs font-bold uppercase transition disabled:cursor-not-allowed flex items-center gap-1"
                            >
                              <i className="fa-solid fa-plus text-[10px]" />
                              <span>{agotado ? 'Agotado' : 'Agregar'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PASO 3: COBRO Y FINALIZACIÓN */}
            {pasoActual === 3 && (
              <div className="bg-[#111111] border border-[#262626] rounded-2xl p-6 text-center max-w-md mx-auto my-auto space-y-5 shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto text-xl">
                  <i className="fa-solid fa-dollar-sign" />
                </div>

                <div>
                  <h2 className="text-xs font-bold uppercase text-[#a3a3a3]">Monto Total de la Orden</h2>
                  <p className="text-4xl font-black text-white font-mono mt-1">${totalGeneral}.00 MXN</p>
                  <p className="text-[11px] text-[#737373] mt-1">{carrito.length} tipo(s) de artículo(s) en orden</p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isProcessingSale || carrito.length === 0}
                    onClick={() => void finalizarVenta('Efectivo')}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-black py-3 rounded-xl uppercase text-xs tracking-wider transition shadow-lg flex items-center justify-center gap-2"
                  >
                    {isProcessingSale ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin" />
                        <span>Guardando en BD...</span>
                      </>
                    ) : (
                      <>
                        <i className="fa-solid fa-money-bill-wave" />
                        <span>Confirmar Pago en Efectivo</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isProcessingSale || carrito.length === 0}
                    onClick={() => void finalizarVenta('Tarjeta Mercado Pago')}
                    className="w-full bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white font-black py-3 rounded-xl uppercase text-xs tracking-wider transition shadow-lg flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-credit-card" />
                    <span>Pago con Tarjeta / Mercado Pago</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Panel Derecho: Resumen de Venta Reactivo */}
          <aside className="w-1/3 bg-[#111111] border-l border-[#262626] p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <h2 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-cart-shopping text-[#D81B60]" />
                  <span>Resumen de Venta</span>
                </h2>
                {carrito.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCarrito([])}
                    className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {carrito.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#737373]">
                  El carrito está vacío. Agrega boletos o dulcería.
                </div>
              ) : (
                carrito.map((item) => (
                  <div key={item.id} className="bg-[#050505] border border-[#262626] p-2.5 rounded-lg flex justify-between items-center text-xs">
                    <div className="space-y-0.5">
                      <p className="font-bold text-white line-clamp-1">{item.nombre}</p>
                      {item.metadata?.asientos && item.metadata.asientos.length > 0 && (
                        <p className="text-[10px] text-[#D81B60] font-mono font-bold">
                          Asientos: {item.metadata.asientos.join(', ')}
                        </p>
                      )}
                      <p className="text-[10px] text-[#a3a3a3] font-mono">
                        ${item.precio} x {item.cantidad}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-black font-mono text-white">${item.precio * item.cantidad}</p>
                      <button
                        type="button"
                        onClick={() => eliminarDelCarrito(item.id)}
                        className="text-[#737373] hover:text-red-400 p-1"
                        title="Eliminar artículo"
                      >
                        <i className="fa-solid fa-trash text-xs" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totalizador y Acción */}
            <div className="border-t border-[#262626] pt-3 mt-3">
              <div className="flex justify-between items-baseline mb-3">
                <span className="text-xs font-bold text-[#a3a3a3] uppercase">TOTAL</span>
                <span className="text-3xl font-black text-white font-mono">${totalGeneral}.00</span>
              </div>
              <button
                type="button"
                disabled={carrito.length === 0}
                onClick={() => setPasoActual(3)}
                className="w-full bg-[#D81B60] hover:bg-pink-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
              >
                <span>Paso 3: Cobrar</span>
                <i className="fa-solid fa-arrow-right text-xs" />
              </button>
            </div>
          </aside>
        </main>

        <SeatMapModal
          isOpen={isSeatModalOpen}
          onClose={() => setIsSeatModalOpen(false)}
          peliculaTitle={selectedPeli?.titulo || ''}
          horario={selectedFuncion?.hora || ''}
          idFuncion={selectedFuncion?.idFuncion}
          precioBoleto={selectedFuncion?.precio || 50}
          onConfirmSeats={handleSeatsConfirmed}
        />

        <QrScannerModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onScanSuccess={(codigo) => void handleQrSuccess(codigo)}
        />

        <ThermalTicketModal
          isOpen={isTicketModalOpen}
          folio={ticketFolio}
          items={carrito.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precio: i.precio }))}
          total={totalGeneral}
          metodoPago={metodoPago}
          onNewSale={resetVenta}
        />

        <TmdbRegisterModal
          isOpen={isTmdbModalOpen}
          onClose={() => setIsTmdbModalOpen(false)}
          onMovieRegistered={() => void fetchCartelera()}
        />
      </div>
    </>
  );
}

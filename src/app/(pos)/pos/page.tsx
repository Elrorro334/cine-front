'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import { taquillaService } from '@/services/taquillaService';
import { ApiError } from '@/lib/apiClient';
import {
  PeliculaCarteleraDto,
  FuncionHorarioDto,
  PreordenDto,
  PreordenComboDto,
  ProductoDto,
  StockFraccionadoDto,
  OrdenLineaCalculadaDto,
  RegistrarVentaDto,
  RegistrarVentaItemDto,
} from '@/types/api';

import SeatMapModal from '@/components/pos/SeatMapModal';
import QrScannerModal from '@/components/pos/QrScannerModal';
import ThermalTicketModal from '@/components/pos/ThermalTicketModal';
import TmdbRegisterModal from '@/components/pos/TmdbRegisterModal';

interface CartItem {
  id: string;
  tipo: 'boleto' | 'dulceria';
  etiquetaCategoria: string;
  nombre: string;
  precio: number;
  cantidad: number;
  subtotal: number;
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

  // Dulcería, catálogo táctil y monitor de stock fraccionado desde BD (HU-07)
  const [dulceria, setDulceria] = useState<ProductoDto[]>([]);
  const [stockFraccionado, setStockFraccionado] = useState<StockFraccionadoDto | null>(null);
  const [loadingDulceria, setLoadingDulceria] = useState<boolean>(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('Todas');
  const [skuInput, setSkuInput] = useState<string>('');

  // Estado de la orden (calculado por el backend)
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [totalGeneral, setTotalGeneral] = useState<number>(0);
  const [totalArticulos, setTotalArticulos] = useState<number>(0);

  const [isSeatModalOpen, setIsSeatModalOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState<boolean>(false);
  const [isTmdbModalOpen, setIsTmdbModalOpen] = useState<boolean>(false);
  const [requiredSeats, setRequiredSeats] = useState<number | undefined>(undefined);

  const [selectedPeli, setSelectedPeli] = useState<PeliculaCarteleraDto | null>(null);
  const [selectedFuncion, setSelectedFuncion] = useState<FuncionHorarioDto | null>(null);
  const [pendingPreorden, setPendingPreorden] = useState<PreordenDto | null>(null);

  const [metodoPago, setMetodoPago] = useState<'Efectivo' | 'Tarjeta Mercado Pago'>('Efectivo');
  const [ticketFolio, setTicketFolio] = useState<string>('');
  const [isProcessingSale, setIsProcessingSale] = useState<boolean>(false);
  const [mensajeFeedback, setMensajeFeedback] = useState<string | null>(null);

  const formatearHoraFuncion = (horaRaw?: string): string => {
    if (!horaRaw) return '';
    const match = /(\d{2}:\d{2})/.exec(horaRaw);
    if (match) return match[1];
    return horaRaw.substring(0, 5);
  };

  const mapearCarritoARequestItems = (items: CartItem[]): RegistrarVentaItemDto[] =>
    items.map((item: CartItem) => ({
      idProducto: item.metadata?.idProducto,
      idFuncion: item.metadata?.idFuncion,
      sku: item.metadata?.sku || '',
      nombre: item.nombre,
      tipo: item.tipo,
      cantidad: item.cantidad,
      precio: item.precio,
      asientos: item.metadata?.asientos,
    }));

  const sincronizarOrdenConBackend = useCallback(
    async (
      itemsBase: CartItem[],
      opciones?: { skuAgregar?: string; idProductoAgregar?: number; cantidadAgregar?: number }
    ) => {
      try {
        if (typeof taquillaService.calcularOrdenPos === 'function') {
          const respuesta = await taquillaService.calcularOrdenPos({
            itemsActuales: mapearCarritoARequestItems(itemsBase),
            skuAgregar: opciones?.skuAgregar ?? null,
            idProductoAgregar: opciones?.idProductoAgregar ?? null,
            cantidadAgregar: opciones?.cantidadAgregar ?? 1,
          });

          if (respuesta) {
            const nuevosItems: CartItem[] = respuesta.items.map(
              (linea: OrdenLineaCalculadaDto, index: number) => ({
                id:
                  linea.idLinea ||
                  (linea.tipo === 'boleto'
                    ? `bol_${linea.idFuncion ?? index}_${(linea.asientos ?? []).join('_')}`
                    : `snk_${linea.idProducto ?? linea.sku}`),
                tipo: linea.tipo === 'boleto' ? 'boleto' : 'dulceria',
                etiquetaCategoria: linea.etiquetaCategoria,
                nombre: linea.nombre,
                precio: linea.precioUnitario,
                cantidad: linea.cantidad,
                subtotal: linea.subtotal,
                metadata: {
                  idProducto: linea.idProducto,
                  idFuncion: linea.idFuncion,
                  sku: linea.sku,
                  asientos: linea.asientos,
                },
              })
            );

            setCarrito(nuevosItems);
            setTotalGeneral(respuesta.totalVenta);
            setTotalArticulos(respuesta.totalArticulos);
            if (respuesta.stockFraccionado !== undefined) {
              setStockFraccionado(respuesta.stockFraccionado ?? null);
            }
            if (respuesta.productosActualizados) {
              setDulceria(
                respuesta.productosActualizados.filter((p: ProductoDto) => !p.esFraccionado)
              );
            }
            setMensajeFeedback(null);
            return;
          }
        }
      } catch (err: unknown) {
        const apiErr = err as { message?: string; data?: { error?: string; message?: string } };
        setMensajeFeedback(
          apiErr?.data?.error ||
            apiErr?.data?.message ||
            apiErr?.message ||
            'Error al validar el producto en el servidor.'
        );
      }
    },
    []
  );

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
      if (typeof taquillaService.getCatalogoDulceriaPos === 'function') {
        const catalogoPos = await taquillaService.getCatalogoDulceriaPos();
        if (catalogoPos && Array.isArray(catalogoPos.snacksYBebidas)) {
          setDulceria(catalogoPos.snacksYBebidas);
          setStockFraccionado(catalogoPos.stockFraccionado ?? null);
          return;
        }
      }
      const data = await taquillaService.getProductosDulceria();
      setDulceria(data ?? []);
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

  const handleAgregarProductoDulceria = async (producto: ProductoDto, cantidad = 1) => {
    if (cantidad > 0 && producto.stock <= 0) {
      setMensajeFeedback(`El producto "${producto.nombre}" no tiene stock disponible.`);
      return;
    }

    await sincronizarOrdenConBackend(carrito, {
      idProductoAgregar: producto.idProducto,
      skuAgregar: producto.sku,
      cantidadAgregar: cantidad,
    });
  };

  const handleCambiarCantidadItem = async (item: CartItem, delta: number) => {
    if (item.tipo === 'boleto') return;

    await sincronizarOrdenConBackend(carrito, {
      idProductoAgregar: item.metadata?.idProducto,
      skuAgregar: item.metadata?.sku,
      cantidadAgregar: delta,
    });
  };

  const handleEscanearSku = async () => {
    const skuLimpio = skuInput.trim();
    if (!skuLimpio) return;

    setSkuInput('');
    await sincronizarOrdenConBackend(carrito, {
      skuAgregar: skuLimpio,
      cantidadAgregar: 1,
    });
  };

  const eliminarDelCarrito = async (id: string) => {
    const filtrados = carrito.filter((i: CartItem) => i.id !== id);
    setCarrito(filtrados);
    await sincronizarOrdenConBackend(filtrados, { cantidadAgregar: 0 });
  };

  const limpiarCarrito = async () => {
    setCarrito([]);
    setTotalGeneral(0);
    setTotalArticulos(0);
    await sincronizarOrdenConBackend([], { cantidadAgregar: 0 });
  };

  const openSeatModal = (pelicula: PeliculaCarteleraDto, funcion: FuncionHorarioDto) => {
    setSelectedPeli(pelicula);
    setSelectedFuncion(funcion);
    setRequiredSeats(undefined);
    setPendingPreorden(null);
    setIsSeatModalOpen(true);
  };

  const agregarPreordenAlCarrito = async (pre: PreordenDto, asientos: string[]) => {
    const itemsNuevos: CartItem[] = [
      ...carrito,
      {
        id: `pre_bol_${pre.codigo}`,
        tipo: 'boleto',
        etiquetaCategoria: 'TAQUILLA',
        nombre: `${pre.pelicula} (${formatearHoraFuncion(pre.horario)}) - ${pre.cliente}`,
        precio: pre.precioBoleto,
        cantidad: asientos.length,
        subtotal: pre.precioBoleto * asientos.length,
        metadata: {
          idFuncion: pre.idFuncion,
          horario: pre.horario,
          sku: 'BOL-GEN',
          asientos,
        },
      },
      ...(pre.combos ?? []).map((combo: PreordenComboDto, index: number) => ({
        id: `pre_cmb_${pre.codigo}_${index}`,
        tipo: 'dulceria' as const,
        etiquetaCategoria: 'DULCERÍA',
        nombre: combo.nombre,
        precio: combo.precio,
        cantidad: combo.cantidad,
        subtotal: combo.precio * combo.cantidad,
      })),
    ];

    setCarrito(itemsNuevos);
    await sincronizarOrdenConBackend(itemsNuevos, { cantidadAgregar: 0 });
  };

  const handleSeatsConfirmed = async (asientos: string[]) => {
    if (pendingPreorden) {
      await agregarPreordenAlCarrito(pendingPreorden, asientos);
      setPendingPreorden(null);
      setPasoActual(3);
      return;
    }

    if (!selectedPeli || !selectedFuncion) return;
    const idUnico = `bol_${selectedFuncion.idFuncion}_${Date.now()}`;
    const precioBoleto = selectedFuncion.precio || 50;

    const nuevoBoleto: CartItem = {
      id: idUnico,
      tipo: 'boleto',
      etiquetaCategoria: 'TAQUILLA',
      nombre: `${selectedPeli.titulo} (${formatearHoraFuncion(selectedFuncion.hora)})`,
      precio: precioBoleto,
      cantidad: asientos.length,
      subtotal: precioBoleto * asientos.length,
      metadata: {
        peliId: selectedPeli.idPelicula,
        idFuncion: selectedFuncion.idFuncion,
        horario: selectedFuncion.hora,
        sku: 'BOL-GEN',
        asientos,
      },
    };

    const itemsActualizados = [...carrito, nuevoBoleto];
    setCarrito(itemsActualizados);
    await sincronizarOrdenConBackend(itemsActualizados, { cantidadAgregar: 0 });
  };

  const handleQrSuccess = async (codigo: string) => {
    setMensajeFeedback(null);
    try {
      const pre = await taquillaService.getPreorden(codigo);
      if (!pre) {
        setMensajeFeedback('Código QR no encontrado en base de datos.');
        return;
      }

      if (!pre.estadoActivo) {
        setMensajeFeedback('La pre-orden se encuentra cancelada o inactiva.');
        return;
      }

      if (pre.boletosGeneral <= 0) {
        setMensajeFeedback('La pre-orden no contiene boletos para canjear.');
        return;
      }

      setPendingPreorden(pre);
      setSelectedPeli({
        idPelicula: 0,
        titulo: pre.pelicula,
        funciones: [],
      });
      setSelectedFuncion({
        idFuncion: pre.idFuncion,
        hora: pre.horario,
        nombreSala: '',
        precio: pre.precioBoleto,
      });
      setRequiredSeats(pre.boletosGeneral);
      setIsSeatModalOpen(true);
    } catch {
      setMensajeFeedback('Error al validar la pre-orden desde SQL Server.');
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
        items: mapearCarritoARequestItems(carrito),
      };

      const resultado = await taquillaService.registrarVenta(payload);
      setTicketFolio(resultado.folio);
      setIsTicketModalOpen(true);

      // Refrescar inventario y funciones en tiempo real
      void fetchCartelera();
      void fetchDulceria();
    } catch (err) {
      console.error('Error registrando venta:', err);
      if (err instanceof ApiError && err.status === 409) {
        setMensajeFeedback('Asiento no disponible: ' + (err.message ?? ''));
      } else {
        setMensajeFeedback('Error al procesar la venta en la base de datos.');
      }
    } finally {
      setIsProcessingSale(false);
    }
  };

  const resetVenta = () => {
    setCarrito([]);
    setTotalGeneral(0);
    setTotalArticulos(0);
    setPasoActual(1);
    setIsTicketModalOpen(false);
    setMensajeFeedback(null);
    setRequiredSeats(undefined);
    setPendingPreorden(null);
    void fetchDulceria();
  };

  const categoriasDulceria: string[] = [
    'Todas',
    ...Array.from(new Set(dulceria.map((p: ProductoDto) => p.categoria))),
  ];

  const productosFiltrados: ProductoDto[] =
    categoriaSeleccionada === 'Todas'
      ? dulceria
      : dulceria.filter((p: ProductoDto) => p.categoria === categoriaSeleccionada);

  const botonesPizza: ProductoDto[] = [
    ...(stockFraccionado?.productoRebanada ? [stockFraccionado.productoRebanada] : []),
    ...(stockFraccionado?.productoPizzaCompleta ? [stockFraccionado.productoPizzaCompleta] : []),
  ];

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
                ? 'bg-[#F57C00] text-white shadow'
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
          <div
            role="alert"
            className="bg-red-950/80 border-b border-red-800 text-red-200 text-xs px-4 py-2 flex items-center justify-between"
          >
            <span>{mensajeFeedback}</span>
            <button
              type="button"
              onClick={() => setMensajeFeedback(null)}
              className="text-red-300 font-bold ml-4"
            >
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
                  {!loadingCartelera &&
                    cartelera.length > 0 &&
                    cartelera.map((pelicula: PeliculaCarteleraDto) => (
                      <div
                        key={pelicula.idPelicula}
                        className="bg-[#111111] border border-[#262626] rounded-xl p-4 space-y-3 shadow-lg hover:border-[#D81B60]/40 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-black uppercase text-white text-sm leading-tight">
                              {pelicula.titulo}
                            </h3>
                            <p className="text-[10px] text-[#a3a3a3] mt-0.5">
                              Clasif. <span className="text-amber-400 font-bold">{pelicula.clasificacion || 'B'}</span>{' '}
                              • {pelicula.duracion || 115} min
                            </p>
                          </div>
                          <span className="text-[9px] bg-neutral-800 text-[#a3a3a3] font-mono px-2 py-0.5 rounded font-bold uppercase">
                            {pelicula.funciones.length} funciones
                          </span>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-[#737373] uppercase mb-1.5">
                            Horarios Disponibles:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {pelicula.funciones.map((funcion: FuncionHorarioDto) => (
                              <button
                                key={funcion.idFuncion}
                                type="button"
                                onClick={() => openSeatModal(pelicula, funcion)}
                                className="bg-[#050505] hover:bg-[#D81B60] text-white px-3 py-1.5 rounded-lg border border-[#262626] hover:border-[#D81B60] text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-sm"
                              >
                                <i className="fa-solid fa-clock text-[10px]" />
                                <span>{formatearHoraFuncion(funcion.hora)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* PASO 2: DULCERÍA, LECTOR DE CÓDIGO DE BARRAS Y STOCK FRACCIONADO (HU-07 / MOCKUP 12) */}
            {pasoActual === 2 && (
              <div className="space-y-4">
                {/* 1. Lector de Código de Barras (SKU) */}
                <div className="bg-[#111111] border border-[#262626] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-white tracking-wider">
                    <i className="fa-solid fa-barcode text-[#a3a3a3] text-base" />
                    <span>Lector de Código de Barras</span>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-80">
                    <input
                      type="text"
                      autoFocus
                      value={skuInput}
                      onChange={(e) => setSkuInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleEscanearSku();
                        }
                      }}
                      placeholder="ESCANEAR SKU (EJ: 7501001)..."
                      className="flex-grow bg-[#050505] text-white px-3 py-2 text-xs font-mono rounded-lg border border-[#262626] focus:border-[#F57C00] outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Escanear SKU"
                      onClick={() => void handleEscanearSku()}
                      className="bg-[#F57C00] hover:bg-orange-600 text-white px-3.5 py-2 rounded-lg text-xs font-black transition shadow"
                    >
                      <i className="fa-solid fa-plus" />
                    </button>
                  </div>
                </div>

                {/* 2. Inventario Fraccionado: Pizzas */}
                {stockFraccionado && (
                  <div className="bg-[#16120e] border border-[#F57C00]/40 rounded-xl p-4 space-y-3 shadow-lg">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-black uppercase text-[#F57C00] tracking-wider flex items-center gap-2">
                          <i className="fa-solid fa-pizza-slice" />
                          <span>Inventario Fraccionado: {stockFraccionado.nombreInsumo}</span>
                        </h3>
                        <p className="text-[10px] text-[#a3a3a3] mt-0.5">
                          Descuento automático proporcional de insumos
                        </p>
                      </div>

                      <div
                        data-testid="pizza-stock-monitor"
                        className="bg-[#050505] border border-[#262626] px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-[#F57C00]"
                      >
                        {stockFraccionado.etiquetaMonitor}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {botonesPizza.map((pizzaProd: ProductoDto) => {
                        const factor = pizzaProd.factorFraccion ?? 1;
                        const sinRebanadasSuficientes = stockFraccionado.stockRebanadasActual < factor;
                        const esPizzaCompleta = factor > 1;

                        return (
                          <button
                            key={pizzaProd.idProducto}
                            type="button"
                            disabled={sinRebanadasSuficientes}
                            onClick={() => void handleAgregarProductoDulceria(pizzaProd, 1)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                              esPizzaCompleta
                                ? 'bg-[#1a110a] border-[#F57C00]/60 hover:border-[#F57C00]'
                                : 'bg-[#0a0a0a] border-[#262626] hover:border-[#F57C00]'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            <div>
                              <p className="text-xs font-black uppercase text-white">{pizzaProd.nombre}</p>
                              <p className="text-[10px] text-[#a3a3a3]">
                                {pizzaProd.descripcionDescuento ||
                                  (esPizzaCompleta
                                    ? `Descuenta ${factor} rebanadas del stock`
                                    : 'Descuenta 1 rebanada del stock')}
                              </p>
                            </div>
                            <span className="text-base font-black text-[#F57C00] font-mono">
                              ${pizzaProd.precio}.00
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Catálogo Táctil de Snacks y Bebidas */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-[#a3a3a3] tracking-wider">
                      Catálogo de Snacks y Bebidas
                    </h3>
                    <span className="text-[10px] text-[#737373] font-mono">Toca para agregar</span>
                  </div>

                  {/* Categorías Chip Picker */}
                  {categoriasDulceria.length > 2 && (
                    <div className="flex flex-wrap gap-2 pb-1">
                      {categoriasDulceria.map((cat: string) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoriaSeleccionada(cat)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                            categoriaSeleccionada === cat
                              ? 'bg-[#F57C00] text-white shadow'
                              : 'bg-[#111111] text-[#a3a3a3] hover:text-white border border-[#262626]'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {loadingDulceria ? (
                    <div className="py-16 text-center text-xs text-[#a3a3a3] font-mono">
                      <i className="fa-solid fa-spinner fa-spin text-xl text-[#F57C00] block mb-2" />
                      <p>Consultando inventario en tiempo real...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {productosFiltrados.map((item: ProductoDto) => {
                        const agotado = item.stock <= 0;
                        return (
                          <div
                            key={item.idProducto}
                            onClick={() => {
                              if (!agotado) {
                                void handleAgregarProductoDulceria(item, 1);
                              }
                            }}
                            className={`relative bg-[#111111] border border-[#262626] rounded-xl p-3 flex flex-col justify-between transition ${
                              agotado
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:border-[#F57C00] cursor-pointer'
                            }`}
                          >
                            <span className="absolute top-2 left-2 z-10 bg-black/80 text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-[#262626]">
                              {item.sku}
                            </span>

                            {item.img && (
                              <img
                                src={item.img}
                                alt={item.nombre}
                                className="w-full h-24 object-cover rounded-lg mb-2 border border-[#262626]"
                              />
                            )}

                            <div className="text-center mt-1">
                              <h4 className="font-black text-white uppercase text-xs line-clamp-1">
                                {item.nombre}
                              </h4>
                              <p className="text-sm font-black text-[#F57C00] font-mono mt-0.5">
                                ${item.precio}
                              </p>
                              <p
                                className={`text-[10px] font-mono mt-0.5 ${
                                  agotado ? 'text-red-400 font-bold' : 'text-[#737373]'
                                }`}
                              >
                                Stock: {item.stock}
                              </p>
                            </div>

                            <div className="mt-2 pt-2 border-t border-[#262626] flex items-center justify-center">
                              <button
                                type="button"
                                disabled={agotado}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void handleAgregarProductoDulceria(item, 1);
                                }}
                                className="w-full bg-[#050505] hover:bg-[#F57C00] text-white px-2.5 py-1 rounded-lg border border-[#262626] hover:border-[#F57C00] text-[11px] font-bold uppercase transition disabled:cursor-not-allowed flex items-center justify-center gap-1"
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
                  <p className="text-[11px] text-[#737373] mt-1">
                    {totalArticulos || carrito.length} artículo(s) en orden
                  </p>
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

          {/* Panel Derecho: Resumen de Venta Reactivo (Mockup 12) */}
          <aside className="w-1/3 bg-[#111111] border-l border-[#262626] p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 border-b border-[#262626]">
                <h2 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                  <i className="fa-solid fa-cart-shopping text-[#D81B60]" />
                  <span>Resumen de Venta</span>
                </h2>
                <div className="flex items-center gap-2">
                  <span className="bg-[#D81B60]/20 text-[#D81B60] border border-[#D81B60]/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {totalArticulos} items
                  </span>
                  {carrito.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void limpiarCarrito()}
                      className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {carrito.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#737373]">
                  El carrito está vacío. Agrega boletos o dulcería.
                </div>
              ) : (
                carrito.map((item: CartItem) => (
                  <div
                    key={item.id}
                    className="bg-[#050505] border border-[#262626] p-3 rounded-xl flex justify-between items-center text-xs gap-2"
                  >
                    <div className="space-y-0.5">
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider ${
                          item.tipo === 'boleto' ? 'text-[#D81B60]' : 'text-[#F57C00]'
                        }`}
                      >
                        {item.etiquetaCategoria || (item.tipo === 'boleto' ? 'TAQUILLA' : 'DULCERÍA')}
                      </span>
                      <p className="font-bold text-white line-clamp-1">{item.nombre}</p>
                      {item.metadata?.asientos && item.metadata.asientos.length > 0 && (
                        <p className="text-[10px] text-[#D81B60] font-mono font-bold">
                          Asientos: {item.metadata.asientos.join(', ')}
                        </p>
                      )}
                      <p className="text-[10px] text-[#a3a3a3] font-mono">${item.precio} c/u</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.tipo === 'dulceria' && (
                        <div className="flex items-center gap-1.5 bg-[#111111] border border-[#262626] rounded-lg px-1.5 py-0.5">
                          <button
                            type="button"
                            aria-label={`Disminuir ${item.nombre}`}
                            onClick={() => void handleCambiarCantidadItem(item, -1)}
                            className="text-[#a3a3a3] hover:text-white px-1 font-bold"
                          >
                            -
                          </button>
                          <span className="font-mono font-bold text-white text-xs">{item.cantidad}</span>
                          <button
                            type="button"
                            aria-label={`Aumentar ${item.nombre}`}
                            onClick={() => void handleCambiarCantidadItem(item, 1)}
                            className="text-[#a3a3a3] hover:text-white px-1 font-bold"
                          >
                            +
                          </button>
                        </div>
                      )}
                      <p className="font-black font-mono text-white">${item.subtotal}</p>
                      <button
                        type="button"
                        onClick={() => void eliminarDelCarrito(item.id)}
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
                <span className="text-xs font-bold text-[#a3a3a3] uppercase">TOTAL VENTA</span>
                <span className="text-3xl font-black text-white font-mono">${totalGeneral}.00</span>
              </div>
              <div className="flex items-center gap-2">
                {pasoActual > 1 && (
                  <button
                    type="button"
                    aria-label="Paso anterior"
                    onClick={() => setPasoActual((prev: number) => Math.max(1, prev - 1))}
                    className="bg-[#1a1a1a] hover:bg-neutral-800 text-white px-3.5 py-3 rounded-xl border border-[#262626] transition"
                  >
                    <i className="fa-solid fa-arrow-left text-xs" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={carrito.length === 0}
                  onClick={() => setPasoActual(3)}
                  className="flex-grow bg-[#F57C00] hover:bg-orange-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg"
                >
                  <span>Paso 3: Cobrar</span>
                  <i className="fa-solid fa-arrow-right text-xs" />
                </button>
              </div>
            </div>
          </aside>
        </main>

        <SeatMapModal
          isOpen={isSeatModalOpen}
          onClose={() => {
            setIsSeatModalOpen(false);
            setRequiredSeats(undefined);
            setPendingPreorden(null);
          }}
          peliculaTitle={selectedPeli?.titulo || ''}
          horario={formatearHoraFuncion(selectedFuncion?.hora)}
          idFuncion={selectedFuncion?.idFuncion}
          precioBoleto={selectedFuncion?.precio || 50}
          onConfirmSeats={(asientos: string[]) => void handleSeatsConfirmed(asientos)}
          requiredSeats={requiredSeats}
        />

        <QrScannerModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          onScanSuccess={(codigo: string) => void handleQrSuccess(codigo)}
        />

        <ThermalTicketModal
          isOpen={isTicketModalOpen}
          folio={ticketFolio}
          items={carrito.map((i: CartItem) => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio: i.precio,
          }))}
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

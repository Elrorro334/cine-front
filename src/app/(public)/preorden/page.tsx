'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import CinemaAmbientParticles from '@/components/public/CinemaAmbientParticles';
import { carteleraService } from '@/services/carteleraService';
import { apiFetch } from '@/lib/apiClient';
import { generarQrDataUrl } from '@/lib/qrcode';
import { Movie } from '@/types/cartelera';
import { ProductoDto, PreordenDto, CrearPreordenDto } from '@/types/api';

const LOCAL_STORAGE_TICKETS_KEY = 'xilotzin_mis_tickets';

function formatShowtimeDate(dias = 12): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function PreordenForm() {
  const searchParams = useSearchParams();
  const initialPeliId = searchParams.get('peli');
  const initialHorario = searchParams.get('horario');
  const initialTab = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'nueva' | 'mis-tickets'>(
    initialTab === 'tickets' ? 'mis-tickets' : 'nueva'
  );

  // Catálogo de películas y dulcería
  const [movies, setMovies] = useState<Movie[]>([]);
  const [dulceriaProductos, setDulceriaProductos] = useState<ProductoDto[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Selección del cliente
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [boletos, setBoletos] = useState<number>(2);
  const [combosSeleccionados, setCombosSeleccionados] = useState<Record<number, number>>({});

  // Datos del cliente
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tickets guardados en local
  const [savedTickets, setSavedTickets] = useState<PreordenDto[]>([]);

  // Ticket activo en modal de confirmación
  const [activeTicket, setActiveTicket] = useState<PreordenDto | null>(null);
  const [activeTicketQrUrl, setActiveTicketQrUrl] = useState<string>('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  // Cargar tickets guardados en localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PreordenDto[];
        if (Array.isArray(parsed)) {
          setSavedTickets(parsed);
        }
      }
    } catch {
      // Ignorar errores de parseo en cliente
    }
  }, []);

  // Cargar cartelera y dulcería de la base de datos
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingCatalog(true);
        const [cartelera, dulceria] = await Promise.all([
          carteleraService.getCarteleraHoy(),
          apiFetch<ProductoDto[]>('/taquilla/dulceria').catch(() => []),
        ]);

        if (isMounted) {
          setMovies(cartelera);
          setDulceriaProductos(Array.isArray(dulceria) ? dulceria : []);

          // Auto-seleccionar película si viene en URL o tomar la primera
          if (cartelera.length > 0) {
            let targetMovie = cartelera[0];
            if (initialPeliId) {
              const matched = cartelera.find((m) => m.id === Number(initialPeliId));
              if (matched) targetMovie = matched;
            }
            setSelectedMovieId(targetMovie.id);

            // Auto-seleccionar horario si viene en URL o tomar el primero
            if (targetMovie.showtimes.length > 0) {
              if (initialHorario && targetMovie.showtimes.includes(initialHorario)) {
                setSelectedHorario(initialHorario);
              } else {
                setSelectedHorario(targetMovie.showtimes[0]);
              }
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoadingCatalog(false);
        }
      }
    }

    void loadData();
    return () => {
      isMounted = false;
    };
  }, [initialPeliId, initialHorario]);

  // Película seleccionada
  const selectedMovie = useMemo(() => {
    return movies.find((m) => m.id === selectedMovieId) || null;
  }, [movies, selectedMovieId]);

  // Cuando cambia la película seleccionada, ajustar el horario seleccionado
  const handleSelectMovie = (movie: Movie) => {
    setSelectedMovieId(movie.id);
    if (movie.showtimes.length > 0) {
      setSelectedHorario(movie.showtimes[0]);
    } else {
      setSelectedHorario(null);
    }
  };

  // Función seleccionada
  const selectedFuncion = useMemo(() => {
    if (!selectedMovie || !selectedMovie.funciones || selectedMovie.funciones.length === 0) {
      return null;
    }
    return (
      selectedMovie.funciones.find((f) => f.hora === selectedHorario) ||
      selectedMovie.funciones[0]
    );
  }, [selectedMovie, selectedHorario]);

  const precioUnitarioBoleto = selectedFuncion?.precio ?? 50;
  const subtotalBoletos = boletos * precioUnitarioBoleto;

  // Cálculo de subtotal de combos
  const subtotalCombos = useMemo(() => {
    let sum = 0;
    for (const [idStr, cant] of Object.entries(combosSeleccionados)) {
      if (cant > 0) {
        const prod = dulceriaProductos.find((p) => p.idProducto === Number(idStr));
        if (prod) {
          sum += prod.precio * cant;
        }
      }
    }
    return sum;
  }, [combosSeleccionados, dulceriaProductos]);

  const totalPagar = subtotalBoletos + subtotalCombos;

  // Modificar boletos
  const modificarBoletos = (delta: number) => {
    setBoletos((prev) => Math.max(1, Math.min(10, prev + delta)));
  };

  // Modificar combos
  const modificarCombo = (idProducto: number, delta: number) => {
    setCombosSeleccionados((prev) => {
      const actual = prev[idProducto] || 0;
      const nuevo = Math.max(0, actual + delta);
      return { ...prev, [idProducto]: nuevo };
    });
  };

  // Validación reactiva de teléfono: 10 dígitos iniciando con 55
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setTelefonoCliente(raw);

    if (raw.length === 0) {
      setPhoneError('El teléfono es obligatorio.');
    } else if (!raw.startsWith('55')) {
      setPhoneError('El número de teléfono debe iniciar con 55 (ej. 5512345678).');
    } else if (raw.length < 10) {
      setPhoneError(`Faltan dígitos: llevas ${raw.length} de 10 dígitos.`);
    } else {
      setPhoneError(null);
    }
  };

  // Guardar ticket en localStorage
  const saveTicketToLocal = (ticket: PreordenDto) => {
    try {
      const updated = [ticket, ...savedTickets.filter((t) => t.codigo !== ticket.codigo)];
      setSavedTickets(updated);
      localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(updated));
    } catch {
      // Ignorar errores de storage
    }
  };

  // Abrir modal de ticket y generar QR
  const abrirModalTicket = async (ticket: PreordenDto) => {
    setActiveTicket(ticket);
    const qrUrl = await generarQrDataUrl(ticket.codigo);
    setActiveTicketQrUrl(qrUrl);
    setIsTicketModalOpen(true);
  };

  // Enviar formulario a la API
  const handleGenerarPreorden = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedFuncion) {
      setFormError('Debes seleccionar una película y horario de función.');
      return;
    }

    if (!nombreCliente.trim() || nombreCliente.trim().length < 3) {
      setFormError('Por favor ingresa tu nombre completo (mínimo 3 caracteres).');
      return;
    }

    if (telefonoCliente.length !== 10 || !telefonoCliente.startsWith('55')) {
      setPhoneError('El teléfono debe contener exactamente 10 dígitos e iniciar con 55 (ej. 5512345678).');
      setFormError('Por favor verifica tu número de teléfono.');
      return;
    }

    try {
      setIsSubmitting(true);

      const combosPayload = Object.entries(combosSeleccionados)
        .filter(([, cant]) => cant > 0)
        .map(([idStr, cant]) => ({
          idProducto: Number(idStr),
          cantidad: cant,
        }));

      const payload: CrearPreordenDto = {
        idFuncion: selectedFuncion.idFuncion,
        boletos,
        nombreCliente: nombreCliente.trim(),
        telefonoCliente: telefonoCliente.trim(),
        combos: combosPayload.length > 0 ? combosPayload : undefined,
      };

      const nuevoTicket = await carteleraService.crearPreorden(payload);
      saveTicketToLocal(nuevoTicket);
      await abrirModalTicket(nuevoTicket);
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setFormError(errorObj?.message || 'Error al generar la pre-orden en la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-['Montserrat',sans-serif] flex flex-col antialiased selection:bg-[#E11D2F] selection:text-white relative">
      <CinemaAmbientParticles />
      <PublicNavbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12 w-full relative z-20">
        {/* Cabecera y Selector de Pestañas (Idéntico a Xilotzin/preorden.html) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#262626]">
          <div>
            <span className="text-[#E11D2F] text-xs font-bold uppercase tracking-[0.3em] block mb-1">
              Módulo Oficial de Pre-orden
            </span>
            <h1 className="text-2xl md:text-4xl font-['Playfair_Display',serif] font-black uppercase text-white tracking-wide">
              Ticket Digital con Código QR
            </h1>
            <p className="text-[#A0A0A0] text-xs font-sans mt-1 max-w-xl">
              Aparta tus boletos y combos sin anticipo ni pago online. Se genera tu código QR oficial con vigencia de 12 días para liquidar directamente en taquilla.
            </p>
          </div>

          <div className="flex items-center bg-[#121212] border border-[#262626] rounded-2xl p-1.5 shrink-0 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab('nueva')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'nueva'
                  ? 'bg-[#E11D2F] text-white shadow-md'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              <i className="fa-solid fa-plus-circle mr-1.5" /> Nueva Pre-orden
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mis-tickets')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                activeTab === 'mis-tickets'
                  ? 'bg-[#E11D2F] text-white shadow-md'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              <i className="fa-solid fa-ticket mr-1.5" /> Mis Tickets ({savedTickets.length})
            </button>
          </div>
        </div>

        {/* ==========================================================
             PESTAÑA 1: FORMULARIO GENERADOR DE PRE-ORDEN
             ========================================================== */}
        {activeTab === 'nueva' ? (
          <form onSubmit={handleGenerarPreorden}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Columna Izquierda: Los 5 Apartados */}
              <div className="lg:col-span-7 space-y-6">
                {/* Apartado 1: Selecciona tu Película */}
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-7 h-7 rounded-full bg-[#E11D2F] text-white font-bold text-xs flex items-center justify-center">
                      1
                    </span>
                    <h2 className="text-lg font-['Playfair_Display',serif] font-black uppercase text-white">
                      Selecciona tu Película
                    </h2>
                  </div>

                  {loadingCatalog ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-[2/3] bg-neutral-900 rounded-xl" />
                      ))}
                    </div>
                  ) : movies.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#A0A0A0] bg-[#0A0A0A] rounded-xl border border-[#262626]">
                      No hay películas disponibles en cartelera en este momento.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                      {movies.map((m) => {
                        const isSelected = m.id === selectedMovieId;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleSelectMovie(m)}
                            className={`group relative rounded-xl overflow-hidden border text-left transition-all aspect-[2/3] focus:outline-none ${
                              isSelected
                                ? 'border-[#E11D2F] ring-2 ring-[#E11D2F] shadow-lg scale-[1.02]'
                                : 'border-[#262626] opacity-75 hover:opacity-100'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={m.posterUrl}
                              alt={m.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                            <span className="absolute top-1.5 right-1.5 bg-[#E11D2F] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                              {m.classification}
                            </span>
                            <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[11px] font-bold text-white uppercase line-clamp-2 leading-tight">
                              {m.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Apartado 2: Horario de Función */}
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#E11D2F] text-white font-bold text-xs flex items-center justify-center">
                        2
                      </span>
                      <h2 className="text-lg font-['Playfair_Display',serif] font-black uppercase text-white">
                        Horario de Función
                      </h2>
                    </div>
                    <span className="text-[10px] text-[#A0A0A0] font-bold uppercase tracking-wider">
                      {selectedFuncion?.nombreSala || 'Sala Principal'}
                    </span>
                  </div>

                  {selectedMovie && selectedMovie.showtimes.length > 0 ? (
                    <div className="flex flex-wrap gap-2.5">
                      {selectedMovie.showtimes.map((hora) => {
                        const isSelected = hora === selectedHorario;
                        return (
                          <button
                            key={hora}
                            type="button"
                            onClick={() => setSelectedHorario(hora)}
                            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 ${
                              isSelected
                                ? 'bg-[#E11D2F] text-white shadow-lg shadow-[#E11D2F]/30 scale-105'
                                : 'bg-[#0A0A0A] border border-[#262626] text-white hover:border-[#E11D2F]'
                            }`}
                          >
                            <i className="fa-solid fa-clock text-[10px]" />
                            <span>{hora}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[#A0A0A0] italic">
                      No hay horarios programados para esta película hoy.
                    </p>
                  )}
                </div>

                {/* Apartado 3: Cantidad de Boletos (Acceso General) */}
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#E11D2F] text-white font-bold text-xs flex items-center justify-center">
                        3
                      </span>
                      <div>
                        <h2 className="text-base sm:text-lg font-['Playfair_Display',serif] font-black uppercase text-white">
                          Cantidad de Boletos
                        </h2>
                        <p className="text-[11px] sm:text-xs text-[#A0A0A0] font-sans">
                          Acceso General • ${precioUnitarioBoleto} MXN por boleto
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-[#0A0A0A] px-3 py-1.5 rounded-xl border border-[#262626] text-xs self-start sm:self-auto">
                      <span className="text-[#A0A0A0] font-bold text-[10px]">Precio Unitario:</span>
                      <span className="font-black text-[#DCA54C] font-mono text-xs">
                        ${precioUnitarioBoleto}.00 MXN
                      </span>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0A0A0A]/80 border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-xs sm:text-sm font-bold uppercase text-white font-sans">
                          Admisión General • {selectedFuncion?.nombreSala || 'Sala 1'}
                        </h3>
                      </div>
                      <p className="text-[11px] sm:text-xs text-[#A0A0A0] leading-relaxed">
                        <i className="fa-solid fa-circle-info text-[#DCA54C] mr-1" />
                        Las butacas numeradas de Sala 1 se asignan exclusivamente en <strong>Taquilla</strong> al escanear y canjear tu código QR en ventanilla física.
                      </p>
                    </div>

                    {/* Selector Numérico */}
                    <div className="flex items-center gap-3 bg-[#121212] p-2 rounded-xl border border-[#262626] shrink-0 self-end sm:self-center shadow">
                      <button
                        type="button"
                        onClick={() => modificarBoletos(-1)}
                        className="w-9 h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#E11D2F] text-white flex items-center justify-center font-bold text-sm transition-colors active:scale-95 shadow"
                        aria-label="Restar un boleto"
                      >
                        <i className="fa-solid fa-minus" />
                      </button>
                      <span className="w-8 text-center text-lg font-black text-white font-mono">
                        {boletos}
                      </span>
                      <button
                        type="button"
                        onClick={() => modificarBoletos(1)}
                        className="w-9 h-9 rounded-lg bg-[#0A0A0A] hover:bg-[#E11D2F] text-white flex items-center justify-center font-bold text-sm transition-colors active:scale-95 shadow"
                        aria-label="Sumar un boleto"
                      >
                        <i className="fa-solid fa-plus" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-amber-200/90">
                    <i className="fa-solid fa-cash-register text-[#DCA54C] mt-0.5 shrink-0 text-xs" />
                    <span>
                      <strong>Asignación en Taquilla:</strong> El cajero seleccionará tus asientos contiguos en el monitor oficial de Sala 1 al momento del pago y canje.
                    </span>
                  </div>
                </div>

                {/* Apartado 4: Combos y Snacks de Dulcería (Opcional) */}
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#E11D2F] text-white font-bold text-xs flex items-center justify-center">
                        4
                      </span>
                      <h2 className="text-lg font-['Playfair_Display',serif] font-black uppercase text-white">
                        Agrega Dulcería a tu Pre-orden
                      </h2>
                    </div>
                    <span className="text-[10px] bg-[#DCA54C]/20 text-[#DCA54C] border border-[#DCA54C]/40 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                      Opcional
                    </span>
                  </div>

                  {dulceriaProductos.length === 0 ? (
                    <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#262626] text-center space-y-1">
                      <p className="text-xs text-neutral-300 font-semibold">
                        Apartado de Dulcería habilitado
                      </p>
                      <p className="text-[11px] text-[#A0A0A0]">
                        Los combos y snacks se mostrarán aquí automáticamente una vez cargados en el inventario por el área de dulcería.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {dulceriaProductos.map((prod) => {
                        const cant = combosSeleccionados[prod.idProducto] || 0;
                        return (
                          <div
                            key={prod.idProducto}
                            className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#262626] flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              {prod.img ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={prod.img}
                                  alt={prod.nombre}
                                  className="w-12 h-12 object-cover rounded-lg shrink-0 border border-[#262626]"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-[#262626] flex items-center justify-center text-[#E11D2F]">
                                  <i className="fa-solid fa-store" />
                                </div>
                              )}
                              <div>
                                <h3 className="text-xs font-bold text-white uppercase">{prod.nombre}</h3>
                                <p className="text-[10px] text-[#A0A0A0]">{prod.categoria}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold text-[#DCA54C]">
                                ${prod.precio} MXN
                              </span>
                              <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-lg border border-[#262626]">
                                <button
                                  type="button"
                                  onClick={() => modificarCombo(prod.idProducto, -1)}
                                  className="w-6 h-6 rounded bg-[#0A0A0A] hover:bg-[#E11D2F] text-white flex items-center justify-center text-xs"
                                  aria-label={`Quitar ${prod.nombre}`}
                                >
                                  <i className="fa-solid fa-minus" />
                                </button>
                                <span className="w-4 text-center font-mono text-xs font-bold">
                                  {cant}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => modificarCombo(prod.idProducto, 1)}
                                  className="w-6 h-6 rounded bg-[#0A0A0A] hover:bg-[#E11D2F] text-white flex items-center justify-center text-xs"
                                  aria-label={`Agregar ${prod.nombre}`}
                                >
                                  <i className="fa-solid fa-plus" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Apartado 5: Datos de Quien Recoge (Validación de teléfono 55) */}
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-7 h-7 rounded-full bg-[#E11D2F] text-white font-bold text-xs flex items-center justify-center">
                      5
                    </span>
                    <h2 className="text-lg font-['Playfair_Display',serif] font-black uppercase text-white">
                      Datos de Quien Recoge
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="input-cliente-nombre" className="block text-xs font-bold uppercase text-[#A0A0A0] mb-1.5">
                        Nombre Completo *
                      </label>
                      <input
                        id="input-cliente-nombre"
                        type="text"
                        value={nombreCliente}
                        onChange={(e) => setNombreCliente(e.target.value)}
                        placeholder="Ej. Carlos Méndez"
                        required
                        className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E11D2F] rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label htmlFor="input-cliente-telefono" className="block text-xs font-bold uppercase text-[#A0A0A0] mb-1.5">
                        Teléfono / WhatsApp (10 dígitos - Inicia con 55) *
                      </label>
                      <input
                        id="input-cliente-telefono"
                        type="tel"
                        value={telefonoCliente}
                        onChange={handlePhoneChange}
                        placeholder="5512345678"
                        maxLength={10}
                        required
                        className={`w-full bg-[#0A0A0A] border rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors font-mono ${
                          phoneError ? 'border-red-500' : 'border-[#262626] focus:border-[#E11D2F]'
                        }`}
                      />
                      {phoneError ? (
                        <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation" /> {phoneError}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#A0A0A0] mt-1">
                          Formato requerido: 10 dígitos iniciando con 55.
                        </p>
                      )}
                    </div>
                  </div>

                  {formError && (
                    <div className="mt-4 bg-red-950/40 border border-red-600/40 text-red-300 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation text-red-400" />
                      <span>{formError}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Resumen en Taquilla (Sticky exacto a Xilotzin) */}
              <div className="lg:col-span-5 sticky top-28">
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 shadow-2xl space-y-6">
                  {/* Encabezado Resumen */}
                  <div className="flex items-center justify-between border-b border-[#262626] pb-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-[#A0A0A0]">
                      Resumen en Taquilla
                    </h2>
                    <span className="text-[10px] bg-[#E11D2F]/20 text-[#E11D2F] border border-[#E11D2F]/40 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Pre-orden QR
                    </span>
                  </div>

                  {/* Ficha Resumen Película */}
                  {selectedMovie && (
                    <div className="flex items-center gap-4 bg-[#0A0A0A] p-3.5 rounded-xl border border-[#262626]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedMovie.posterUrl}
                        alt={selectedMovie.title}
                        className="w-14 h-20 object-cover rounded-lg shrink-0 border border-[#262626]"
                      />
                      <div className="space-y-1">
                        <h3 className="font-['Playfair_Display',serif] font-black text-sm uppercase text-white leading-tight">
                          {selectedMovie.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs font-mono text-[#A0A0A0]">
                          <span className="text-white flex items-center gap-1">
                            <i className="fa-solid fa-clock text-[#E11D2F]" /> {selectedHorario || '16:00'}
                          </span>
                          <span>•</span>
                          <span className="bg-[#262626] px-1.5 py-0.5 rounded text-[10px] text-white">
                            Clasif. {selectedMovie.classification}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Desglose de Precios */}
                  <div className="space-y-3 text-xs border-b border-[#262626] pb-4">
                    <div className="flex justify-between items-center text-white">
                      <span className="text-[#A0A0A0]">
                        Boletos Generales ({boletos} × ${precioUnitarioBoleto}):
                      </span>
                      <span className="font-bold font-mono text-sm">${subtotalBoletos} MXN</span>
                    </div>

                    {subtotalCombos > 0 ? (
                      Object.entries(combosSeleccionados)
                        .filter(([, cant]) => cant > 0)
                        .map(([idStr, cant]) => {
                          const prod = dulceriaProductos.find((p) => p.idProducto === Number(idStr));
                          if (!prod) return null;
                          return (
                            <div key={idStr} className="flex justify-between items-center text-white text-[11px]">
                              <span className="text-[#A0A0A0]">
                                {prod.nombre} ({cant} × ${prod.precio}):
                              </span>
                              <span className="font-bold font-mono text-white">
                                ${prod.precio * cant} MXN
                              </span>
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-[#A0A0A0]/70 italic text-[11px] pt-1 border-t border-dashed border-[#262626]">
                        Sin combos adicionales seleccionados.
                      </p>
                    )}
                  </div>

                  {/* Total a Pagar */}
                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#A0A0A0] block">
                        Total a Pagar en Taquilla
                      </span>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                        <i className="fa-solid fa-circle-check text-[9px]" /> Sin cobro por internet
                      </span>
                    </div>
                    <span className="text-3xl md:text-4xl font-['Playfair_Display',serif] font-black text-[#DCA54C] font-mono">
                      ${totalPagar} MXN
                    </span>
                  </div>

                  {/* Botón de Enviar */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-[#E11D2F] to-red-700 hover:from-red-700 hover:to-[#E11D2F] disabled:opacity-50 text-white py-4 px-6 rounded-2xl font-sans font-black text-sm uppercase tracking-widest transition-all shadow-xl hover:shadow-[#E11D2F]/50 flex items-center justify-center gap-3 cursor-pointer"
                  >
                    <i className="fa-solid fa-qrcode text-lg" />
                    <span>{isSubmitting ? 'Generando Folio...' : 'Generar Mi Ticket Digital QR'}</span>
                  </button>

                  <p className="text-center text-[10px] text-[#A0A0A0] font-sans leading-relaxed">
                    Tu código QR se guardará en tu dispositivo y tendrá una validez oficial de 12 días.
                  </p>
                </div>
              </div>
            </div>
          </form>
        ) : (
          /* ==========================================================
               PESTAÑA 2: MIS TICKETS DIGITALES ACTIVOS
               ========================================================== */
          <div className="space-y-6 max-w-4xl mx-auto">
            {savedTickets.length === 0 ? (
              <div className="bg-[#121212] border border-[#262626] rounded-3xl p-12 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#1c1c1c] mx-auto flex items-center justify-center text-[#A0A0A0] text-2xl">
                  <i className="fa-solid fa-ticket" />
                </div>
                <h2 className="text-lg font-bold text-white uppercase">Aún no tienes tickets generados</h2>
                <p className="text-xs text-[#A0A0A0] max-w-sm mx-auto">
                  Genera tu primera pre-orden digital para reservar tus boletos sin costo previo y canjearlos en taquilla física.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('nueva')}
                  className="mt-2 bg-[#E11D2F] hover:bg-[#c81928] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2"
                >
                  <i className="fa-solid fa-plus" /> Generar Pre-orden
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedTickets.map((t) => (
                  <div
                    key={t.codigo}
                    className="bg-[#121212] border border-[#262626] rounded-2xl p-5 shadow-xl space-y-4 flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between border-b border-[#262626] pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-[#E11D2F] uppercase tracking-widest block">
                          {t.codigo}
                        </span>
                        <h3 className="text-base font-['Playfair_Display',serif] font-black uppercase text-white mt-0.5">
                          {t.pelicula}
                        </h3>
                        <p className="text-[11px] text-[#A0A0A0] font-sans">
                          Función: {t.horario} • {t.boletosGeneral} boletos
                        </p>
                      </div>
                      <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                        Vigente
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[#A0A0A0]">Total en Taquilla:</span>
                      <span className="font-mono font-black text-sm text-[#DCA54C]">
                        ${t.total} MXN
                      </span>
                    </div>

                    <div className="pt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={() => abrirModalTicket(t)}
                        className="flex-1 bg-[#E11D2F] hover:bg-[#c81928] text-white py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                      >
                        <i className="fa-solid fa-qrcode" /> Ver Código QR
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ==========================================================
           MODAL OFICIAL: TICKET DIGITAL QR (Captura 3)
           ========================================================== */}
      {isTicketModalOpen && activeTicket && (
        <dialog
          open
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md border-none m-0 max-w-none max-h-none w-full h-full"
        >
          {/* Backdrop click */}
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => setIsTicketModalOpen(false)}
            className="fixed inset-0 bg-transparent cursor-default w-full h-full border-none p-0 -z-10 focus:outline-none"
          />

          <div className="bg-[#121212] border-2 border-[#E11D2F] rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto relative shadow-2xl p-5 sm:p-7 text-center printable-ticket">
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center text-white hover:bg-[#E11D2F] transition-colors border border-[#262626] text-sm no-print"
              aria-label="Cerrar ticket"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Check y Folio */}
            <div className="flex flex-col items-center mb-4">
              <div className="w-11 h-11 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-2">
                <i className="fa-solid fa-check text-lg" />
              </div>
              <span className="text-[11px] font-mono font-bold text-[#E11D2F] tracking-[0.25em] uppercase">
                {activeTicket.codigo}
              </span>
              <h2 className="text-xl sm:text-2xl font-['Playfair_Display',serif] font-black uppercase text-white mt-1 leading-tight">
                {activeTicket.pelicula}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#A0A0A0] font-sans mt-1">
                Función: {activeTicket.horario} • {activeTicket.boletosGeneral} Boletos • Asignación en Taquilla
              </p>
            </div>

            {/* Código QR de Alta Definición */}
            <div className="bg-white p-3 rounded-2xl w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-4 shadow-2xl flex items-center justify-center border-4 border-black/10">
              {activeTicketQrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeTicketQrUrl}
                  alt={`Código QR ${activeTicket.codigo}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-black text-xs font-mono font-bold">Cargando QR...</div>
              )}
            </div>

            {/* Detalles de Vigencia y Folio */}
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-3 mb-4 text-xs font-mono space-y-1.5 text-left">
              <div className="flex justify-between items-center text-[#A0A0A0]">
                <span>Válido hasta:</span>
                <span className="text-white font-bold">{formatShowtimeDate(12)}</span>
              </div>
              <div className="flex justify-between items-center text-[#A0A0A0]">
                <span>Total en Taquilla:</span>
                <span className="text-[#DCA54C] font-black text-sm">${activeTicket.total} MXN</span>
              </div>
              <div className="flex justify-between items-center text-[#A0A0A0]">
                <span>Estado:</span>
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded text-[10px]">
                  VIGENTE ({activeTicket.vigenciaDias || 12} DÍAS)
                </span>
              </div>
            </div>

            {/* Caja Informativa de Canje */}
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-3.5 mb-5 text-left flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-[#DCA54C] text-black font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                ?
              </div>
              <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                <strong className="text-white">¿Cómo canjearlo?</strong> Llega a la taquilla física de Cine Xilotzin, muestra este código QR al cajero en tu pantalla y realiza el pago en efectivo o tarjeta para entrar a tu función.
              </p>
            </div>

            {/* Botones de Acción (Imprimir PDF / Ver en Mis Tickets) */}
            <div className="flex gap-2.5 no-print">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="flex-1 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333] text-white py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <i className="fa-solid fa-print" />
                <span>Imprimir / PDF</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTicketModalOpen(false);
                  setActiveTab('mis-tickets');
                }}
                className="flex-1 bg-[#E11D2F] hover:bg-[#c81928] text-white py-3 px-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg"
              >
                <i className="fa-solid fa-check" />
                <span>Ver en Mis Tickets</span>
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Estilos para Impresión limpia en PDF */}
      <style jsx global>{`
        @media print {
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          header, footer, .no-print {
            display: none !important;
          }
          .printable-ticket {
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px solid #000000 !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 auto !important;
          }
          .printable-ticket h2,
          .printable-ticket span,
          .printable-ticket p {
            color: #000000 !important;
          }
          .printable-ticket .bg-\[\#0A0A0A\] {
            background: #f5f5f5 !important;
            border-color: #cccccc !important;
          }
        }
      `}</style>

      <PublicFooter />
    </div>
  );
}

export default function PreordenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center text-xs uppercase tracking-widest font-mono">
          Cargando Módulo de Pre-orden Xilotzin...
        </div>
      }
    >
      <PreordenForm />
    </Suspense>
  );
}

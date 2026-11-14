'use client';

import React, { useState, useEffect, useMemo, useSyncExternalStore, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import CinemaAmbientParticles from '@/components/public/CinemaAmbientParticles';
import MisTicketsSection from '@/components/public/MisTicketsSection';
import { carteleraService } from '@/services/carteleraService';
import { apiFetch } from '@/lib/apiClient';
import { generarQrDataUrl } from '@/lib/qrcode';
import { normalizeMexicanPhone, formatTicketValidityDate } from '@/lib/phoneUtils';
import { Movie } from '@/types/cartelera';
import { ProductoDto, PreordenDto, CrearPreordenDto } from '@/types/api';

const LOCAL_STORAGE_TICKETS_KEY = 'xilotzin_mis_tickets';
const LOCAL_STORAGE_VERIFIED_PHONE_KEY = 'xilotzin_verified_phone';
const TICKETS_SYNC_EVENT = 'xilotzin_tickets_updated';
const VERIFIED_PHONE_SYNC_EVENT = 'xilotzin_verified_phone_updated';
const EMPTY_TICKETS: PreordenDto[] = [];

let cachedTicketsRaw: string | null | undefined;
let cachedTicketsValue: PreordenDto[] = EMPTY_TICKETS;

function subscribeLocalKey(eventName: string) {
  return (callback: () => void): () => void => {
    if (typeof window === 'undefined') {
      return () => {};
    }
    window.addEventListener('storage', callback);
    window.addEventListener(eventName, callback);
    return () => {
      window.removeEventListener('storage', callback);
      window.removeEventListener(eventName, callback);
    };
  };
}

const subscribeSavedTickets = subscribeLocalKey(TICKETS_SYNC_EVENT);
const subscribeVerifiedPhone = subscribeLocalKey(VERIFIED_PHONE_SYNC_EVENT);

function readSavedTicketsSnapshot(): PreordenDto[] {
  if (typeof window === 'undefined') {
    return EMPTY_TICKETS;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY);
    if (raw === cachedTicketsRaw) {
      return cachedTicketsValue;
    }
    cachedTicketsRaw = raw;
    if (!raw) {
      cachedTicketsValue = EMPTY_TICKETS;
      return cachedTicketsValue;
    }
    const parsed = JSON.parse(raw) as unknown;
    cachedTicketsValue = Array.isArray(parsed) ? (parsed as PreordenDto[]) : EMPTY_TICKETS;
    return cachedTicketsValue;
  } catch {
    cachedTicketsRaw = null;
    cachedTicketsValue = EMPTY_TICKETS;
    return EMPTY_TICKETS;
  }
}

function getServerTicketsSnapshot(): PreordenDto[] {
  return EMPTY_TICKETS;
}

function readVerifiedPhoneSnapshot(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VERIFIED_PHONE_KEY);
    if (!raw) {
      return null;
    }
    const { phone, error } = normalizeMexicanPhone(raw);
    return error === null && phone.length === 10 ? phone : null;
  } catch {
    return null;
  }
}

function getServerVerifiedPhoneSnapshot(): string | null {
  return null;
}

function writeSavedTickets(tickets: PreordenDto[]) {
  try {
    if (tickets.length === 0) {
      localStorage.removeItem(LOCAL_STORAGE_TICKETS_KEY);
    } else {
      localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(tickets));
    }
    window.dispatchEvent(new Event(TICKETS_SYNC_EVENT));
  } catch {
    // Ignorar errores de storage
  }
}

const CATEGORY_ICONS: Record<string, string> = {
  palomitas: 'fa-solid fa-fire-burner',
  bebidas: 'fa-solid fa-glass-water',
  alimentos: 'fa-solid fa-utensils',
  combos: 'fa-solid fa-layer-group',
  dulces: 'fa-solid fa-candy-cane',
  snacks: 'fa-solid fa-cookie-bite',
  pizzas: 'fa-solid fa-pizza-slice',
};

function getCategoryIcon(cat: string): string {
  const key = cat.toLowerCase();
  for (const [prefix, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(prefix)) return icon;
  }
  return 'fa-solid fa-store';
}

function buildDulceriaPageTokens(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, '...', totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage, '...', totalPages];
}

const MAX_NOMBRE_LENGTH = 50;
const DULCERIA_PAGE_SIZE = 6;

function writeVerifiedPhone(phone: string | null) {
  try {
    if (phone) {
      localStorage.setItem(LOCAL_STORAGE_VERIFIED_PHONE_KEY, phone);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_VERIFIED_PHONE_KEY);
    }
    window.dispatchEvent(new Event(VERIFIED_PHONE_SYNC_EVENT));
  } catch {
    // Ignorar errores de storage
  }
}

function PreordenForm() {
  const searchParams = useSearchParams();
  const initialPeliId = searchParams.get('peli');
  const initialHorario = searchParams.get('horario');
  const initialTab = searchParams.get('tab');

  const [manualTab, setManualTab] = useState<{
    tabParam: string | null;
    value: 'nueva' | 'mis-tickets';
  } | null>(null);

  const urlDefaultTab: 'nueva' | 'mis-tickets' =
    initialTab === 'tickets' ? 'mis-tickets' : 'nueva';
  const activeTab: 'nueva' | 'mis-tickets' =
    manualTab && manualTab.tabParam === initialTab ? manualTab.value : urlDefaultTab;

  const setActiveTab = (tab: 'nueva' | 'mis-tickets') => {
    setManualTab({ tabParam: initialTab, value: tab });
  };

  // Catálogo de películas y dulcería
  const [movies, setMovies] = useState<Movie[]>([]);
  const [dulceriaProductos, setDulceriaProductos] = useState<ProductoDto[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Selección del cliente
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  const [boletos, setBoletos] = useState<number>(1);
  const [combosSeleccionados, setCombosSeleccionados] = useState<Record<number, number>>({});

  // Datos del cliente
  const [nombreCliente, setNombreCliente] = useState('');
  const [nombreError, setNombreError] = useState<string | null>(null);
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de dulcería estilo menú KFC / Cartelera
  const [selectedDulceriaCategory, setSelectedDulceriaCategory] = useState<string>('Todas');
  const [dulceriaSearchQuery, setDulceriaSearchQuery] = useState<string>('');
  const [dulceriaPage, setDulceriaPage] = useState<number>(1);

  // Tickets guardados y teléfono verificado en este dispositivo (sincronizados sin efecto bloqueante)
  const savedTickets = useSyncExternalStore(
    subscribeSavedTickets,
    readSavedTicketsSnapshot,
    getServerTicketsSnapshot
  );
  const verifiedPhone = useSyncExternalStore(
    subscribeVerifiedPhone,
    readVerifiedPhoneSnapshot,
    getServerVerifiedPhoneSnapshot
  );

  // Ticket activo en modal de confirmación
  const [activeTicket, setActiveTicket] = useState<PreordenDto | null>(null);
  const [activeTicketQrUrl, setActiveTicketQrUrl] = useState<string>('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

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

  // Modificar combos (Conserva la selección entre páginas y categorías)
  const modificarCombo = (idProducto: number, delta: number) => {
    setCombosSeleccionados((prev) => {
      const actual = prev[idProducto] || 0;
      const nuevo = Math.max(0, actual + delta);
      if (nuevo === 0) {
        const next = { ...prev };
        delete next[idProducto];
        return next;
      }
      return { ...prev, [idProducto]: nuevo };
    });
  };

  // Manejador del nombre: Solo letras (incluyendo acentos, ñ, diéresis) y espacios, con límite
  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = raw.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    const cleaned = sanitized.replace(/\s{2,}/g, ' ');
    const trimmedToMax = cleaned.slice(0, MAX_NOMBRE_LENGTH);

    setNombreCliente(trimmedToMax);
    if (trimmedToMax.trim().length > 0 && trimmedToMax.trim().length < 3) {
      setNombreError('El nombre debe contener al menos 3 letras.');
    } else {
      setNombreError(null);
    }
  };

  // Categorías únicas de dulcería con orden preferencial (Combos, Palomitas, Bebidas, etc.)
  const dulceriaCategorias = useMemo(() => {
    const unique = Array.from(
      new Set(dulceriaProductos.map((p) => p.categoria).filter((c) => Boolean(c && c.trim())))
    );
    const priority = ['Palomitas', 'Combos', 'Bebidas', 'Alimentos', 'Dulces', 'Snacks', 'Pizzas'];
    const sorted = unique.sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['Todas', ...sorted];
  }, [dulceriaProductos]);

  // Filtrado de dulcería por categoría seleccionada y término de búsqueda
  const filteredDulceriaProductos = useMemo(() => {
    const q = dulceriaSearchQuery.trim().toLowerCase();
    return dulceriaProductos.filter((prod) => {
      const matchesCat =
        selectedDulceriaCategory === 'Todas' ||
        prod.categoria.toLowerCase() === selectedDulceriaCategory.toLowerCase();
      const matchesQuery =
        q === '' ||
        prod.nombre.toLowerCase().includes(q) ||
        prod.categoria.toLowerCase().includes(q) ||
        prod.sku.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [dulceriaProductos, selectedDulceriaCategory, dulceriaSearchQuery]);

  const dulceriaTotalPages = Math.max(1, Math.ceil(filteredDulceriaProductos.length / DULCERIA_PAGE_SIZE));
  const currentDulceriaPage = Math.min(dulceriaPage, dulceriaTotalPages);

  const paginatedDulceriaProductos = useMemo(() => {
    const start = (currentDulceriaPage - 1) * DULCERIA_PAGE_SIZE;
    return filteredDulceriaProductos.slice(start, start + DULCERIA_PAGE_SIZE);
  }, [filteredDulceriaProductos, currentDulceriaPage]);

  // Conteo de artículos seleccionados por categoría (para badge en botón)
  const getSelectedCountForCategory = (cat: string) => {
    return Object.entries(combosSeleccionados).reduce((count, [idStr, cant]) => {
      if (cant <= 0) return count;
      const p = dulceriaProductos.find((prod) => prod.idProducto === Number(idStr));
      if (!p) return count;
      if (cat === 'Todas' || p.categoria.toLowerCase() === cat.toLowerCase()) {
        return count + cant;
      }
      return count;
    }, 0);
  };

  const totalArticulosDulceria = useMemo(() => {
    return Object.values(combosSeleccionados).reduce((acc, curr) => acc + curr, 0);
  }, [combosSeleccionados]);

  // Normalización y validación reactiva de teléfono de México (10 dígitos nacionales)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { phone, error } = normalizeMexicanPhone(e.target.value);
    setTelefonoCliente(phone);
    setPhoneError(error);
  };

  // Guardar ticket recién generado para el mismo teléfono en localStorage (caché offline HU-03)
  const saveTicketToLocal = (ticket: PreordenDto) => {
    const current = readSavedTicketsSnapshot();
    const ticketPhone = normalizeMexicanPhone(ticket.telefono || '').phone;
    if (verifiedPhone && ticketPhone && verifiedPhone !== ticketPhone) {
      writeVerifiedPhone(null);
    }
    const samePhoneTickets = ticketPhone
      ? current.filter(
          (t) =>
            t.codigo !== ticket.codigo &&
            normalizeMexicanPhone(t.telefono || '').phone === ticketPhone
        )
      : current.filter((t) => t.codigo !== ticket.codigo);
    writeSavedTickets([ticket, ...samePhoneTickets]);
  };

  // Reemplazar caché local y recordar dispositivo verificado para ese teléfono
  const handleTicketsRecovered = (phone: string, recoveredTickets: PreordenDto[]) => {
    writeSavedTickets(recoveredTickets);
    writeVerifiedPhone(phone);
  };

  const handleChangeVerifiedPhone = () => {
    writeVerifiedPhone(null);
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
    setNombreError(null);

    if (!selectedFuncion) {
      setFormError('Debes seleccionar una película y horario de función.');
      return;
    }

    const nombreTrimmed = nombreCliente.trim();
    if (!nombreTrimmed || nombreTrimmed.length < 3) {
      setNombreError('Por favor ingresa tu nombre completo (mínimo 3 letras).');
      setFormError('Por favor verifica el nombre de quien recoge.');
      return;
    }

    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]{3,50}$/.test(nombreTrimmed)) {
      setNombreError('El nombre solo debe contener letras y espacios (máximo 50 caracteres).');
      setFormError('Por favor verifica el nombre de quien recoge.');
      return;
    }

    if (telefonoCliente.length !== 10 || telefonoCliente.startsWith('0') || telefonoCliente.startsWith('1')) {
      setPhoneError('El teléfono debe contener 10 dígitos válidos de México (ej. Tula 7731234567 o CDMX 5512345678).');
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
    if (typeof window === 'undefined') return;
    const prevTitle = document.title;
    if (activeTicket) {
      document.title = `Ticket_${activeTicket.codigo}_Xilotzin`;
    }
    window.print();
    if (activeTicket) {
      document.title = prevTitle;
    }
  };

  return (
    <div className={`public-theme-root min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-['Montserrat',sans-serif] flex flex-col antialiased selection:bg-[#E11D2F] selection:text-white relative ${isTicketModalOpen ? 'modal-ticket-active' : ''}`}>
      <div className="no-print">
        <CinemaAmbientParticles />
      </div>
      <div className="no-print">
        <PublicNavbar />
      </div>

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
              <i className="fa-solid fa-ticket mr-1.5" />{' '}
              {verifiedPhone ? `Mis Tickets (${savedTickets.length})` : 'Mis Tickets'}
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

                {/* Apartado 4: Combos y Snacks de Dulcería (Opcional - Estilo Menú KFC / Cartelera) */}
                <div className="bg-[#121212] border border-[#262626] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#262626] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full bg-[#E11D2F] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        4
                      </span>
                      <div>
                        <h2 className="text-base sm:text-lg font-['Playfair_Display',serif] font-black uppercase text-white">
                          Agrega Dulcería a tu Pre-orden
                        </h2>
                        <p className="text-[11px] sm:text-xs text-[#A0A0A0] font-sans">
                          Elige tus palomitas, bebidas y snacks por categoría (se liquidan en caja)
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-[#DCA54C]/20 text-[#DCA54C] border border-[#DCA54C]/40 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest self-start sm:self-auto">
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
                    <>
                      {/* Resumen de Artículos Seleccionados en Dulcería (Conserva la selección entre páginas y categorías) */}
                      {totalArticulosDulceria > 0 && (
                        <div className="bg-[#1a1112] border border-[#E11D2F]/40 rounded-xl p-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                              <i className="fa-solid fa-basket-shopping text-[#E11D2F]" />
                              Seleccionados: {totalArticulosDulceria} {totalArticulosDulceria === 1 ? 'producto' : 'productos'} (${subtotalCombos} MXN)
                            </span>
                            <button
                              type="button"
                              onClick={() => setCombosSeleccionados({})}
                              className="text-[10px] text-red-400 hover:text-red-300 underline font-semibold cursor-pointer"
                            >
                              Limpiar selección
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                            {Object.entries(combosSeleccionados)
                              .filter(([, cant]) => cant > 0)
                              .map(([idStr, cant]) => {
                                const prod = dulceriaProductos.find((p) => p.idProducto === Number(idStr));
                                if (!prod) return null;
                                return (
                                  <span
                                    key={idStr}
                                    className="inline-flex items-center gap-1.5 bg-[#0A0A0A] border border-[#333] px-2.5 py-1 rounded-lg text-[11px] font-sans text-neutral-200"
                                  >
                                    <span className="font-bold text-white truncate max-w-[140px]">{prod.nombre}</span>
                                    <span className="font-mono text-[#DCA54C] font-bold">x{cant}</span>
                                    <button
                                      type="button"
                                      onClick={() => modificarCombo(prod.idProducto, -1)}
                                      className="w-4 h-4 rounded hover:bg-[#E11D2F] hover:text-white text-[#A0A0A0] flex items-center justify-center text-[10px] ml-0.5 cursor-pointer"
                                      aria-label={`Restar ${prod.nombre}`}
                                    >
                                      <i className="fa-solid fa-minus text-[8px]" />
                                    </button>
                                  </span>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Selector de Categorías Estilo Menú KFC / Rectángulos (Palomitas, Bebidas, etc.) */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">
                            Categorías de Dulcería:
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            Pulsa un recuadro para filtrar
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {dulceriaCategorias.map((cat) => {
                            const isSelected = selectedDulceriaCategory === cat;
                            const selectedCount = getSelectedCountForCategory(cat);
                            return (
                              <button
                                key={cat}
                                type="button"
                                aria-label={`Categoría ${cat}`}
                                onClick={() => {
                                  setSelectedDulceriaCategory(cat);
                                  setDulceriaPage(1);
                                }}
                                className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#E11D2F] border-[#E11D2F] text-white shadow-lg shadow-[#E11D2F]/30 scale-[1.02]'
                                    : 'bg-[#0A0A0A] border-[#262626] text-neutral-300 hover:border-[#E11D2F] hover:text-white'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <i className={`${getCategoryIcon(cat)} text-xs ${isSelected ? 'text-white' : 'text-[#E11D2F]'}`} />
                                  <span className="text-xs font-bold uppercase truncate">{cat}</span>
                                </div>
                                {selectedCount > 0 && (
                                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                    isSelected ? 'bg-white text-black' : 'bg-[#E11D2F] text-white'
                                  }`}>
                                    {selectedCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Barra de búsqueda opcional dentro de dulcería */}
                      <div className="relative">
                        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs" />
                        <input
                          type="text"
                          value={dulceriaSearchQuery}
                          onChange={(e) => {
                            setDulceriaSearchQuery(e.target.value);
                            setDulceriaPage(1);
                          }}
                          placeholder={`Buscar en ${selectedDulceriaCategory === 'Todas' ? 'toda la dulcería' : selectedDulceriaCategory}...`}
                          className="w-full bg-[#0A0A0A] border border-[#262626] focus:border-[#E11D2F] rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none transition-colors"
                        />
                        {dulceriaSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setDulceriaSearchQuery('');
                              setDulceriaPage(1);
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                            aria-label="Limpiar búsqueda de dulcería"
                          >
                            <i className="fa-solid fa-xmark" />
                          </button>
                        )}
                      </div>

                      {/* Desglose de Productos en Rectángulos / Tarjetas */}
                      {filteredDulceriaProductos.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[#A0A0A0] bg-[#0A0A0A] rounded-xl border border-[#262626]">
                          No se encontraron productos en &quot;{selectedDulceriaCategory}&quot;.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {paginatedDulceriaProductos.map((prod) => {
                            const cant = combosSeleccionados[prod.idProducto] || 0;
                            const isSelected = cant > 0;
                            return (
                              <div
                                key={prod.idProducto}
                                className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-[#181112] border-[#E11D2F] shadow-lg shadow-[#E11D2F]/20'
                                    : 'bg-[#0A0A0A] border-[#262626] hover:border-[#404040]'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  {prod.img ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={prod.img}
                                      alt={prod.nombre}
                                      className="w-14 h-14 object-cover rounded-xl shrink-0 border border-[#262626]"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-xl bg-neutral-900 border border-[#262626] flex items-center justify-center text-[#E11D2F] shrink-0">
                                      <i className={`${getCategoryIcon(prod.categoria)} text-xl`} />
                                    </div>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <span className="inline-block text-[9px] font-mono font-bold tracking-wider text-[#A0A0A0] uppercase bg-[#171717] px-2 py-0.5 rounded border border-[#262626] mb-1">
                                      {prod.categoria}
                                    </span>
                                    <h3 className="text-xs font-bold text-white uppercase leading-snug line-clamp-2">
                                      {prod.nombre}
                                    </h3>
                                    <span className="text-xs font-mono font-black text-[#DCA54C] block mt-1">
                                      ${prod.precio} MXN
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-[#262626]/60">
                                  <span className="text-[10px] text-[#A0A0A0] font-sans">
                                    {isSelected ? (
                                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        <i className="fa-solid fa-check" /> {cant} en pre-orden
                                      </span>
                                    ) : (
                                      <span>Disponible</span>
                                    )}
                                  </span>

                                  <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-xl border border-[#262626]">
                                    <button
                                      type="button"
                                      onClick={() => modificarCombo(prod.idProducto, -1)}
                                      disabled={cant === 0}
                                      className="w-7 h-7 rounded-lg bg-[#0A0A0A] hover:bg-[#E11D2F] disabled:opacity-30 disabled:hover:bg-[#0A0A0A] text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                                      aria-label={`Quitar ${prod.nombre}`}
                                    >
                                      <i className="fa-solid fa-minus text-[10px]" />
                                    </button>
                                    <span className="w-6 text-center font-mono text-xs font-bold text-white">
                                      {cant}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => modificarCombo(prod.idProducto, 1)}
                                      className="w-7 h-7 rounded-lg bg-[#0A0A0A] hover:bg-[#E11D2F] text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                                      aria-label={`Agregar ${prod.nombre}`}
                                    >
                                      <i className="fa-solid fa-plus text-[10px]" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Paginación de Dulcería (Mantiene la selección intacta al cambiar de página) */}
                      {dulceriaTotalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-[#262626] text-xs">
                          <span className="text-[11px] text-[#A0A0A0] font-sans">
                            Pág. {currentDulceriaPage} de {dulceriaTotalPages} ({filteredDulceriaProductos.length} {filteredDulceriaProductos.length === 1 ? 'producto' : 'productos'})
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDulceriaPage((prev) => Math.max(1, prev - 1))}
                              disabled={currentDulceriaPage <= 1}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] hover:bg-[#262626] disabled:opacity-30 text-white border border-[#262626] text-xs font-bold transition-colors cursor-pointer"
                              aria-label="Página anterior de dulcería"
                            >
                              <i className="fa-solid fa-chevron-left text-[10px]" />
                            </button>

                            {buildDulceriaPageTokens(currentDulceriaPage, dulceriaTotalPages).map((token, idx) => {
                              if (typeof token === 'string') {
                                return (
                                  <span key={`el-${idx}`} className="text-[#A0A0A0] px-1 text-xs">
                                    ...
                                  </span>
                                );
                              }
                              const isActive = token === currentDulceriaPage;
                              return (
                                <button
                                  key={token}
                                  type="button"
                                  onClick={() => setDulceriaPage(token)}
                                  className={`w-7 h-7 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                                    isActive
                                      ? 'bg-[#E11D2F] text-white shadow'
                                      : 'bg-[#0A0A0A] hover:bg-[#262626] text-neutral-300 border border-[#262626]'
                                  }`}
                                >
                                  {token}
                                </button>
                              );
                            })}

                            <button
                              type="button"
                              onClick={() => setDulceriaPage((prev) => Math.min(dulceriaTotalPages, prev + 1))}
                              disabled={currentDulceriaPage >= dulceriaTotalPages}
                              className="px-2.5 py-1.5 rounded-lg bg-[#0A0A0A] hover:bg-[#262626] disabled:opacity-30 text-white border border-[#262626] text-xs font-bold transition-colors cursor-pointer"
                              aria-label="Página siguiente de dulcería"
                            >
                              <i className="fa-solid fa-chevron-right text-[10px]" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Apartado 5: Datos de Quien Recoge (Validación de solo letras y límite en nombre) */}
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
                      <div className="flex items-center justify-between mb-1.5">
                        <label htmlFor="input-cliente-nombre" className="block text-xs font-bold uppercase text-[#A0A0A0]">
                          Nombre Completo *
                        </label>
                        <span className="text-[10px] text-[#A0A0A0] font-mono">
                          {nombreCliente.length}/{MAX_NOMBRE_LENGTH}
                        </span>
                      </div>
                      <input
                        id="input-cliente-nombre"
                        type="text"
                        value={nombreCliente}
                        onChange={handleNombreChange}
                        placeholder="Ej. Carlos Méndez"
                        maxLength={MAX_NOMBRE_LENGTH}
                        required
                        className={`w-full bg-[#0A0A0A] border rounded-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors max-w-full ${
                          nombreError ? 'border-red-500' : 'border-[#262626] focus:border-[#E11D2F]'
                        }`}
                      />
                      {nombreError ? (
                        <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation" /> {nombreError}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#A0A0A0] mt-1">
                          Solo letras y espacios (sin números ni símbolos especiales).
                        </p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="input-cliente-telefono" className="block text-xs font-bold uppercase text-[#A0A0A0] mb-1.5">
                        Teléfono / WhatsApp (10 dígitos - México) *
                      </label>
                      <div className="relative flex items-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-3 bg-[#171717] border border-r-0 border-[#262626] rounded-l-xl text-xs font-semibold text-[#D4D4D4] select-none">
                          <i className="fa-solid fa-phone text-[#E11D2F] text-[10px]" aria-hidden="true" />
                          <span className="font-mono text-white text-xs">+52</span>
                        </span>
                        <input
                          id="input-cliente-telefono"
                          type="tel"
                          value={telefonoCliente}
                          onChange={handlePhoneChange}
                          placeholder="Ej. 7731234567"
                          maxLength={15}
                          required
                          className={`w-full bg-[#0A0A0A] border rounded-r-xl px-4 py-3 text-xs text-white focus:outline-none transition-colors font-mono ${
                            phoneError ? 'border-red-500' : 'border-[#262626] focus:border-[#E11D2F]'
                          }`}
                        />
                      </div>
                      {phoneError ? (
                        <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-triangle-exclamation" /> {phoneError}
                        </p>
                      ) : (
                        <p className="text-[10px] text-[#A0A0A0] mt-1">
                          Formato: 10 dígitos de cualquier lada de México (ej. Tula 773, CDMX 55, Jilotepec 761).
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

                  {/* Datos de Entrega en Resumen (Truncado para evitar desbordamientos) */}
                  {nombreCliente.trim() && (
                    <div className="flex items-center justify-between gap-2 bg-[#0A0A0A] p-2.5 rounded-xl border border-[#262626] text-xs">
                      <span className="text-[#A0A0A0] flex items-center gap-1.5 shrink-0">
                        <i className="fa-solid fa-user text-[#E11D2F] text-[10px]" /> Recoge:
                      </span>
                      <span className="font-bold text-white truncate max-w-[200px]" title={nombreCliente.trim()}>
                        {nombreCliente.trim()}
                      </span>
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
               PESTAÑA 2: MIS TICKETS DIGITALES ACTIVOS + RECUPERACIÓN SMS (HU-03)
               ========================================================== */
          <MisTicketsSection
            tickets={savedTickets}
            verifiedPhone={verifiedPhone}
            onOpenQr={(ticket) => {
              void abrirModalTicket(ticket);
            }}
            onGoToNewPreorder={() => setActiveTab('nueva')}
            onTicketsRecovered={handleTicketsRecovered}
            onChangeVerifiedPhone={handleChangeVerifiedPhone}
          />
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
            className="fixed inset-0 bg-transparent cursor-default w-full h-full border-none p-0 -z-10 focus:outline-none no-print"
          />

          <div className="bg-[#121212] border-2 border-[#E11D2F] rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto relative shadow-2xl p-5 sm:p-6 text-center printable-ticket">
            {/* Encabezado Corporativo para Impresión en PDF (1 sola hoja) */}
            <div className="hidden print:block border-b-2 border-dashed border-black pb-2 mb-2 text-center">
              <span className="text-xs font-black tracking-[0.25em] uppercase text-black block">
                Cine Teatro Xilotzin
              </span>
              <span className="text-[10px] text-neutral-600 uppercase tracking-widest font-mono">
                Comprobante Oficial de Pre-orden Digital
              </span>
            </div>

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 w-8 h-8 rounded-full bg-[#0A0A0A] flex items-center justify-center text-white hover:bg-[#E11D2F] transition-colors border border-[#262626] text-sm no-print cursor-pointer"
              aria-label="Cerrar ticket"
            >
              <i className="fa-solid fa-xmark" />
            </button>

            {/* Check y Folio */}
            <div className="flex flex-col items-center mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-1.5 print:bg-emerald-50 print:text-emerald-700 print:border-emerald-600">
                <i className="fa-solid fa-check text-base" />
              </div>
              <span className="text-[11px] font-mono font-bold text-[#E11D2F] print:text-red-700 tracking-[0.25em] uppercase">
                {activeTicket.codigo}
              </span>
              <h2 className="text-xl sm:text-2xl font-['Playfair_Display',serif] font-black uppercase text-white print:text-black mt-1 leading-tight">
                {activeTicket.pelicula}
              </h2>
              <p className="text-[11px] sm:text-xs text-[#A0A0A0] print:text-neutral-700 font-sans mt-0.5">
                Función: {activeTicket.horario} • {activeTicket.boletosGeneral} Boletos • Asignación en Taquilla
              </p>
            </div>

            {/* Código QR de Alta Definición */}
            <div className="bg-white p-2 rounded-2xl w-44 h-44 sm:w-48 sm:h-48 mx-auto mb-3 shadow-2xl flex items-center justify-center border-4 border-black/10 print:border-2 print:border-black qr-box">
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
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-3 mb-3 text-xs font-mono space-y-1 text-left ticket-info-box">
              {activeTicket.cliente && (
                <div className="flex justify-between items-center text-[#A0A0A0] print:text-neutral-800">
                  <span>Titular:</span>
                  <span className="text-white print:text-black font-bold truncate max-w-[180px]" title={activeTicket.cliente}>
                    {activeTicket.cliente}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-[#A0A0A0] print:text-neutral-800">
                <span>Válido hasta:</span>
                <span className="text-white print:text-black font-bold">
                  {formatTicketValidityDate(activeTicket.fechaCreacion, activeTicket.vigenciaDias || 12)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#A0A0A0] print:text-neutral-800">
                <span>Total en Taquilla:</span>
                <span className="text-[#DCA54C] print:text-black font-black text-sm">${activeTicket.total} MXN</span>
              </div>
              <div className="flex justify-between items-center text-[#A0A0A0] print:text-neutral-800">
                <span>Estado:</span>
                <span className="text-emerald-400 print:text-emerald-800 font-bold bg-emerald-950/60 print:bg-emerald-50 px-2 py-0.5 rounded text-[10px] print:border print:border-emerald-600">
                  {activeTicket.estadoActivo === false ? 'CANJEADO' : `VIGENTE (${activeTicket.vigenciaDias || 12} DÍAS)`}
                </span>
              </div>
            </div>

            {/* Caja Informativa de Canje */}
            <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-2.5 mb-4 text-left flex items-start gap-2 ticket-help-box">
              <div className="w-5 h-5 rounded-full bg-[#DCA54C] text-black font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5 print:bg-black print:text-white">
                <i className="fa-solid fa-info" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#A0A0A0] print:text-neutral-700 leading-snug">
                <strong className="text-white print:text-black">¿Cómo canjearlo?</strong> Presenta este código QR en la taquilla física de Cine Xilotzin (en tu móvil o impreso) y realiza el pago para entrar a tu función.
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

      {/* Estilos para Impresión limpia en EXACTAMENTE 1 sola hoja PDF */}
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 6mm 10mm;
          }

          html,
          body {
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            overflow: visible !important;
          }

          .min-h-screen {
            min-height: 0 !important;
            height: auto !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .no-print,
          nav,
          footer,
          header,
          main,
          [aria-label="Cerrar modal"],
          [aria-label="Cerrar ticket"] {
            display: none !important;
          }

          dialog {
            position: static !important;
            display: block !important;
            inset: auto !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            overflow: visible !important;
          }

          .printable-ticket {
            display: block !important;
            position: static !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px dashed #000000 !important;
            border-radius: 12px !important;
            box-shadow: none !important;
            max-width: 380px !important;
            width: 100% !important;
            margin: 0 auto !important;
            padding: 14px 18px !important;
            max-height: none !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-before: avoid !important;
            break-before: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
          }

          .printable-ticket * {
            color: #000000 !important;
            text-shadow: none !important;
          }

          .printable-ticket .qr-box {
            width: 145px !important;
            height: 145px !important;
            margin: 6px auto !important;
            padding: 4px !important;
            border: 2px solid #000000 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }

          .printable-ticket .qr-box img {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain !important;
          }

          .printable-ticket .ticket-info-box {
            background: #f8f8f8 !important;
            border: 1px solid #d1d5db !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            margin-bottom: 8px !important;
          }

          .printable-ticket .ticket-help-box {
            background: #fdfdfd !important;
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            padding: 8px 12px !important;
            margin-bottom: 0 !important;
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

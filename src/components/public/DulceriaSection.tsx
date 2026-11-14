'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ProductoDto } from '@/types/api';

interface DulceriaSectionProps {
  readonly products: ProductoDto[];
  readonly loading: boolean;
}

const ITEMS_PER_PAGE = 8;
type StockFilter = 'todos' | 'disponibles' | 'agotados';
type PageToken = number | 'ellipsis-left' | 'ellipsis-right';

function buildPaginationTokens(currentPage: number, totalPages: number): PageToken[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis-left',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    'ellipsis-left',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-right',
    totalPages,
  ];
}

export default function DulceriaSection({ products, loading }: DulceriaSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('todos');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Categorías únicas
  const categories = useMemo(() => {
    const unique = Array.from(
      new Set(products.map((p) => p.categoria).filter((c) => Boolean(c && c.trim())))
    );
    return ['Todas', ...unique];
  }, [products]);

  // Filtrado reactivo por categoría, búsqueda y disponibilidad de stock
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return products.filter((p) => {
      // Filtro por categoría
      const matchesCategory =
        selectedCategory === 'Todas' ||
        p.categoria.toLowerCase() === selectedCategory.toLowerCase();

      // Filtro por búsqueda de texto
      const matchesSearch =
        query === '' ||
        p.nombre.toLowerCase().includes(query) ||
        p.categoria.toLowerCase().includes(query) ||
        (p.descripcionDescuento && p.descripcionDescuento.toLowerCase().includes(query)) ||
        p.sku.toLowerCase().includes(query);

      // Filtro por stock
      let matchesStock = true;
      if (stockFilter === 'disponibles') {
        matchesStock = p.stock > 0;
      } else if (stockFilter === 'agotados') {
        matchesStock = p.stock <= 0;
      }

      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [products, selectedCategory, searchQuery, stockFilter]);

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedProducts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, safeCurrentPage]);

  // Manejadores para resetear la página al filtrar
  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStockFilterChange = (sf: StockFilter) => {
    setStockFilter(sf);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSelectedCategory('Todas');
    setSearchQuery('');
    setStockFilter('todos');
    setCurrentPage(1);
  };

  const handlePageChange = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(targetPage, totalPages));
    if (clamped === safeCurrentPage) return;
    setCurrentPage(clamped);
    if (typeof window !== 'undefined') {
      const el = document.getElementById('dulceria');
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const paginationTokens = useMemo(
    () => buildPaginationTokens(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
  );

  const startIndex = filteredProducts.length === 0 ? 0 : (safeCurrentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredProducts.length);

  return (
    <section
      id="dulceria"
      className="scroll-mt-28 pt-12 border-t border-[#262626] space-y-8"
    >
      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-sans font-bold uppercase tracking-[0.25em] text-[#E11D2F]">
            <i className="fa-solid fa-bag-shopping" aria-hidden="true" /> Tienda Oficial de Snacks
          </span>
          <h2 className="text-3xl md:text-4xl font-['Playfair_Display',serif] font-black uppercase tracking-wider text-white">
            Dulcería & Combos
          </h2>
          <p className="text-[#A0A0A0] text-xs font-sans max-w-xl">
            Palomitas calientitas, nachos crujientes, combos y refrescos fríos. Consulta existencias y precios en tiempo real para agregarlos a tu Pre-orden QR y recogerlos en caja física sin filas.
          </p>
        </div>

        <Link
          href="/preorden"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#E11D2F] hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#E11D2F]/25 transition-all shrink-0"
        >
          <i className="fa-solid fa-qrcode" aria-hidden="true" /> Armar Pre-orden QR
        </Link>
      </div>

      {/* Barra de Filtros, Búsqueda y Disponibilidad */}
      <div className="space-y-4 bg-[#121212] border border-[#262626] rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Input de Búsqueda de Productos */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373] text-xs">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar snacks, combos, bebidas, palomitas..."
              className="w-full bg-[#0A0A0A] text-white placeholder-[#737373] text-xs pl-9 pr-8 py-2.5 rounded-xl border border-[#262626] focus:border-[#E11D2F] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
                aria-label="Limpiar búsqueda"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Filtro por disponibilidad de Stock */}
          <div className="flex items-center gap-1.5 shrink-0 bg-[#0A0A0A] p-1 rounded-xl border border-[#262626]">
            <button
              type="button"
              onClick={() => handleStockFilterChange('todos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                stockFilter === 'todos'
                  ? 'bg-[#262626] text-white shadow'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => handleStockFilterChange('disponibles')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                stockFilter === 'disponibles'
                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/50 shadow'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Disponibles
            </button>
            <button
              type="button"
              onClick={() => handleStockFilterChange('agotados')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                stockFilter === 'agotados'
                  ? 'bg-red-600/30 text-red-400 border border-red-500/50 shadow'
                  : 'text-[#A0A0A0] hover:text-white'
              }`}
            >
              Agotados
            </button>
          </div>
        </div>

        {/* Pills de Categorías */}
        {categories.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
            <span className="text-[11px] font-sans font-bold uppercase text-[#737373] shrink-0 mr-1">
              Categoría:
            </span>
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all shrink-0 ${
                    active
                      ? 'public-theme-pill-active bg-[#E11D2F] text-white shadow-md'
                      : 'bg-[#0A0A0A] text-[#A0A0A0] border border-[#262626] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Estado de Carga */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="bg-[#121212] border border-[#262626] rounded-2xl p-4 space-y-3 animate-pulse"
            >
              <div className="w-full h-36 bg-neutral-900 rounded-xl" />
              <div className="h-4 bg-neutral-800 rounded w-2/3" />
              <div className="h-3 bg-neutral-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      )}

      {/* Estado Vacío */}
      {!loading && filteredProducts.length === 0 && (
        <div className="py-12 text-center bg-[#121212] border border-[#262626] rounded-2xl p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#1e1e1e] border border-[#333333] flex items-center justify-center text-[#E11D2F] mx-auto text-lg">
            <i className="fa-solid fa-store-slash" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold text-white uppercase">
            No se encontraron productos en dulcería
          </p>
          <p className="text-xs text-[#A0A0A0] max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'Todas' || stockFilter !== 'todos'
              ? 'No hay productos que coincidan con los filtros aplicados. Intenta ajustar la búsqueda o seleccionar otra categoría.'
              : 'El catálogo de dulcería no tiene artículos registrados en este momento.'}
          </p>
          {(searchQuery || selectedCategory !== 'Todas' || stockFilter !== 'todos') && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-[#262626] text-xs font-bold text-white hover:bg-[#E11D2F] transition-colors"
            >
              Restablecer Filtros
            </button>
          )}
        </div>
      )}

      {/* Grid de Productos Paginados */}
      {!loading && paginatedProducts.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {paginatedProducts.map((prod) => {
              const disponible = prod.stock > 0;
              const isCombo = prod.categoria.toLowerCase().includes('combo');

              return (
                <article
                  key={prod.idProducto}
                  className="bg-[#121212] border border-[#262626] rounded-2xl overflow-hidden flex flex-col hover:border-[#E11D2F]/60 transition-colors shadow-lg group"
                >
                  <div className="relative h-40 w-full bg-[#0A0A0A] border-b border-[#262626] overflow-hidden">
                    {prod.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={prod.img}
                        alt={prod.nombre}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#E11D2F] text-2xl bg-neutral-950">
                        <i className={`fa-solid ${isCombo ? 'fa-box-open' : 'fa-store'}`} aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/80 text-white border border-white/15">
                      {prod.categoria}
                    </span>
                    {isCombo && (
                      <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DCA54C] text-black shadow">
                        Combo
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase leading-snug group-hover:text-[#E11D2F] transition-colors">
                        {prod.nombre}
                      </h3>
                      <p className="text-[10px] text-[#A0A0A0] font-mono mt-0.5">
                        SKU: {prod.sku}
                      </p>
                      {prod.descripcionDescuento && (
                        <p className="text-[11px] text-[#A0A0A0] mt-1 line-clamp-2">
                          {prod.descripcionDescuento}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#222222]">
                      <span className="text-base font-mono font-black text-[#DCA54C]">
                        ${prod.precio.toFixed(2)} MXN
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          disponible
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {disponible ? `Stock: ${prod.stock}` : 'Agotado'}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Barra de Paginación Moderna y Responsiva */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-6 border-t border-[#262626]">
            {/* Resumen de Resultados */}
            <div className="text-xs text-[#A0A0A0] font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E11D2F] shrink-0" aria-hidden="true" />
              <span>
                Mostrando {startIndex} - {endIndex} de {filteredProducts.length} productos
                {totalPages > 1 && (
                  <span className="text-[#737373] ml-1">
                    (Página {safeCurrentPage} de {totalPages})
                  </span>
                )}
              </span>
            </div>

            {/* Controles de Navegación */}
            {totalPages > 1 && (
              <nav
                aria-label="Paginación de dulcería"
                className="flex items-center flex-wrap justify-center gap-1 sm:gap-1.5 max-w-full"
              >
                {/* Ir a Primera Página */}
                <button
                  type="button"
                  aria-label="Primera página"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => handlePageChange(1)}
                  className="w-8 h-8 rounded-lg text-xs font-mono font-bold bg-[#121212] border border-[#262626] text-[#A0A0A0] hover:text-white hover:bg-[#1f1f1f] hover:border-[#DCA54C]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                >
                  <i className="fa-solid fa-angles-left text-[10px]" aria-hidden="true" />
                </button>

                {/* Página Anterior */}
                <button
                  type="button"
                  aria-label="Página anterior"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => handlePageChange(safeCurrentPage - 1)}
                  className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono font-bold uppercase bg-[#121212] border border-[#262626] text-[#A0A0A0] hover:text-white hover:bg-[#1f1f1f] hover:border-[#DCA54C]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
                >
                  <i className="fa-solid fa-chevron-left text-[10px]" aria-hidden="true" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                {/* Números de Página / Tokens */}
                <div className="flex items-center gap-1">
                  {paginationTokens.map((token) => {
                    if (token === 'ellipsis-left' || token === 'ellipsis-right') {
                      return (
                        <span
                          key={token}
                          className="w-7 sm:w-8 h-8 flex items-center justify-center text-xs font-mono text-[#737373] select-none shrink-0"
                          aria-hidden="true"
                        >
                          ...
                        </span>
                      );
                    }

                    const isCurrent = token === safeCurrentPage;
                    return (
                      <button
                        key={token}
                        type="button"
                        aria-label={String(token)}
                        aria-current={isCurrent ? 'page' : undefined}
                        onClick={() => handlePageChange(token)}
                        className={`w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center shrink-0 ${
                          isCurrent
                            ? 'bg-[#E11D2F] text-white shadow-md shadow-[#E11D2F]/25 border border-[#E11D2F] font-black'
                            : 'bg-[#121212] border border-[#262626] text-[#A0A0A0] hover:text-white hover:bg-[#1f1f1f] hover:border-[#DCA54C]/50'
                        }`}
                      >
                        {token}
                      </button>
                    );
                  })}
                </div>

                {/* Página Siguiente */}
                <button
                  type="button"
                  aria-label="Página siguiente"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => handlePageChange(safeCurrentPage + 1)}
                  className="h-8 px-2.5 sm:px-3 rounded-lg text-xs font-mono font-bold uppercase bg-[#121212] border border-[#262626] text-[#A0A0A0] hover:text-white hover:bg-[#1f1f1f] hover:border-[#DCA54C]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <i className="fa-solid fa-chevron-right text-[10px]" aria-hidden="true" />
                </button>

                {/* Ir a Última Página */}
                <button
                  type="button"
                  aria-label="Última página"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => handlePageChange(totalPages)}
                  className="w-8 h-8 rounded-lg text-xs font-mono font-bold bg-[#121212] border border-[#262626] text-[#A0A0A0] hover:text-white hover:bg-[#1f1f1f] hover:border-[#DCA54C]/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
                >
                  <i className="fa-solid fa-angles-right text-[10px]" aria-hidden="true" />
                </button>
              </nav>
            )}
          </div>
        </>
      )}
    </section>
  );
}

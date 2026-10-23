'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-[#262626]">
      {/* Barra Superior Marquee Estacional */}
      <div className="bg-gradient-to-r from-[#E11D2F] via-red-700 to-[#E11D2F] text-white py-1.5 px-4 border-b border-[#E11D2F]/50 shadow-md text-xs font-sans">
        <div className="max-w-7xl mx-auto overflow-hidden whitespace-nowrap">
          <p className="text-[11px] sm:text-xs font-bold tracking-wider truncate text-center">
            <i className="fa-solid fa-film mr-2" /> CINE XILOTZIN • LA TRADICIÓN CINEMATOGRÁFICA DE JILOTEPEC DESDE 1998 • BOLETOS GENERALES $50 • CARTELERA EN VIVO <i className="fa-solid fa-ticket ml-2" />
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 sm:gap-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E11D2F] to-[#DCA54C] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#E11D2F]/20 group-hover:scale-105 transition-transform">
              <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-widest uppercase leading-none text-white drop-shadow-[0_0_15px_rgba(225,29,47,0.3)]">
                Xilotzin
              </h1>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-sans font-bold tracking-[0.3em] text-[#E11D2F] uppercase mt-1">
                Cine Tradicional
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 font-sans font-bold text-xs tracking-widest uppercase">
            <a
              href="#cartelera"
              className="flex items-center gap-2 text-white hover:text-[#E11D2F] transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4 text-[#E11D2F]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
              Cartelera
            </a>
            <a
              href="#promociones"
              className="flex items-center gap-2 text-[#a3a3a3] hover:text-white transition-colors"
            >
              <svg aria-hidden="true" className="w-4 h-4 text-[#E11D2F]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              Dulcería & Combos
            </a>
            <a
              href="#promociones"
              className="flex items-center gap-2 bg-[#E11D2F]/15 hover:bg-[#E11D2F] text-white px-3.5 py-1.5 rounded-lg border border-[#E11D2F]/40 transition-all shadow-md"
            >
              <svg aria-hidden="true" className="w-4 h-4 text-[#E11D2F]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Pre-orden QR
            </a>
            <a
              href="#cartelera"
              className="flex items-center gap-2 text-[#a3a3a3] hover:text-white transition-colors"
              title="Mis Tickets y Compras"
            >
              <svg aria-hidden="true" className="w-4 h-4 text-[#E11D2F]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
              Mis Tickets
            </a>
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
              aria-label="Abrir menú"
            >
              <svg aria-hidden="true" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#262626] bg-[#0d0d0d] px-4 pt-3 pb-4 space-y-2 text-xs font-bold uppercase">
          <a
            href="#cartelera"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-white hover:text-[#E11D2F]"
          >
            Cartelera
          </a>
          <a
            href="#promociones"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            Dulcería & Combos
          </a>
          <a
            href="#promociones"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            Pre-orden QR
          </a>
          <a
            href="#cartelera"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            Mis Tickets
          </a>
          <Link
            href="/login"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white border-t border-[#262626] pt-3"
          >
            Acceso Sistema POS
          </Link>
        </div>
      )}
    </header>
  );
}

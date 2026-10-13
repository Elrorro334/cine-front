'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0d0d0d]/90 backdrop-blur-md border-b border-[#262626]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D81B60] to-[#F57C00] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-[#D81B60]/20 group-hover:scale-105 transition-transform">
              X
            </div>
            <div>
              <span className="font-['Playfair_Display',serif] tracking-wider text-base sm:text-lg font-black uppercase text-white block leading-tight">
                Cine Teatro Xilotzin
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#F57C00] block">
                Jilotepec • Edoméx
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs uppercase font-bold tracking-wider">
            <a href="#cartelera" className="text-[#f3f4f6] hover:text-[#D81B60] transition-colors">
              Cartelera de Hoy
            </a>
            <a href="#promociones" className="text-[#a3a3a3] hover:text-white transition-colors">
              Promociones
            </a>
            <a href="#nosotros" className="text-[#a3a3a3] hover:text-white transition-colors">
              El Cine
            </a>
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg border border-[#262626] bg-[#141414] text-[#a3a3a3] hover:text-white hover:border-[#D81B60] text-xs font-bold uppercase transition-all"
            >
              Acceso Personal
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="px-2.5 py-1 text-[11px] font-bold uppercase rounded-lg border border-[#262626] text-[#a3a3a3]"
            >
              Caja
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
              aria-label="Abrir menú"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="block py-2 text-white hover:text-[#D81B60]"
          >
            Cartelera de Hoy
          </a>
          <a
            href="#promociones"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            Promociones
          </a>
          <a
            href="#nosotros"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            El Cine
          </a>
          <Link
            href="/login"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#F57C00] border-t border-[#262626] pt-3"
          >
            Ingreso Empleados (POS)
          </Link>
        </div>
      )}
    </header>
  );
}

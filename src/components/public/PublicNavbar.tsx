'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ThemeInfo {
  theme: 'traditional' | 'halloween' | 'christmas' | 'mexican';
  marqueeText: string;
  marqueeIcon: string;
  subtitle: string;
  headerIcon: string;
}

const THEME_CONFIGS: Record<string, ThemeInfo> = {
  traditional: {
    theme: 'traditional',
    marqueeText: 'CINE XILOTZIN • LA TRADICIÓN CINEMATOGRÁFICA DE JILOTEPEC DESDE 1998 • BOLETOS GENERALES $50 • CARTELERA EN VIVO',
    marqueeIcon: 'fa-solid fa-film',
    subtitle: 'Cine Tradicional',
    headerIcon: 'fa-solid fa-film text-white',
  },
  halloween: {
    theme: 'halloween',
    marqueeText: '¡NOCHES DE TERROR EN XILOTZIN! FUNCIONES DE MEDIANOCHE • PALOMITAS PUMPKIN SPICE • BOLETOS $50 • 2X1 SI VIENES DISFRAZADO',
    marqueeIcon: 'fa-solid fa-ghost text-orange-400',
    subtitle: 'Noches de Terror',
    headerIcon: 'fa-solid fa-skull text-orange-500 spooky-float',
  },
  christmas: {
    theme: 'christmas',
    marqueeText: '¡LA MAGIA DE LA NAVIDAD EN XILOTZIN! CHOCOLATE CALIENTE & PALOMITAS CARAMELIZADAS • CINE FAMILIAR DE FIN DE AÑO',
    marqueeIcon: 'fa-solid fa-snowflake text-amber-300',
    subtitle: 'Especial Navideño',
    headerIcon: 'fa-solid fa-snowflake text-amber-300',
  },
  mexican: {
    theme: 'mexican',
    marqueeText: '¡VIVA MÉXICO EN CINE XILOTZIN! • CARTELERA DE GALA PATRIA • COMBOS TRICOLOR • ORGULLO DE JILOTEPEC',
    marqueeIcon: 'fa-solid fa-flag text-emerald-400',
    subtitle: 'Fiestas Mexicanas',
    headerIcon: 'fa-solid fa-flag text-emerald-400',
  },
};

export default function PublicNavbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTheme, setActiveTheme] = useState<string>('traditional');

  useEffect(() => {
    const updateCurrentTheme = () => {
      if (typeof document === 'undefined') return;
      const themeKey = document.documentElement.dataset.cineTheme || '';
      if (themeKey.includes('halloween')) {
        setActiveTheme('halloween');
      } else if (themeKey.includes('christmas')) {
        setActiveTheme('christmas');
      } else if (themeKey.includes('mexican') || themeKey.includes('patrias')) {
        setActiveTheme('mexican');
      } else {
        setActiveTheme('traditional');
      }
    };

    updateCurrentTheme();

    const handleThemeChange = () => updateCurrentTheme();
    window.addEventListener('xilotzin_theme_change', handleThemeChange);

    return () => {
      window.removeEventListener('xilotzin_theme_change', handleThemeChange);
    };
  }, []);

  const themeInfo = THEME_CONFIGS[activeTheme] || THEME_CONFIGS.traditional;

  return (
    <header className="sticky top-0 z-50 bg-[#0d0d0d]/95 backdrop-blur-md border-b border-[#262626] relative transition-colors duration-500">
      {/* Guirnalda de Luces Navideñas (visible cuando el tema activo es Navideño) */}
      {activeTheme === 'christmas' && (
        <div className="christmas-lights" id="christmas-lights-bar" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="light-bulb" />
          ))}
        </div>
      )}

      {/* Guirnalda de Papel Picado Mexicano (visible cuando el tema activo es Fiestas Patrias) */}
      {activeTheme === 'mexican' && (
        <div className="mexican-papel-picado" id="mexican-papel-picado-bar" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="banderin-picado" />
          ))}
        </div>
      )}

      {/* Barra Superior Marquee Estacional */}
      <div className="theme-marquee-bar public-theme-marquee py-1.5 px-4 shadow-md text-xs font-sans transition-all duration-400">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 overflow-hidden whitespace-nowrap">
          <i className={`${themeInfo.marqueeIcon} shrink-0`} aria-hidden="true" />
          <p className="text-[11px] sm:text-xs font-bold tracking-wider truncate text-center">
            {themeInfo.marqueeText}
          </p>
          <i className={`${themeInfo.marqueeIcon} shrink-0`} aria-hidden="true" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 sm:gap-4 group cursor-pointer">
            <div className="flex items-center gap-3 relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#E11D2F] to-[#DCA54C] flex items-center justify-center shadow-lg shadow-[#E11D2F]/20 group-hover:scale-105 transition-transform">
                <i className={`${themeInfo.headerIcon} text-xl`} aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-black tracking-widest uppercase leading-none text-white drop-shadow-[0_0_15px_rgba(225,29,47,0.3)]">
                Xilotzin
              </h1>
              <span className="text-[9px] sm:text-[10px] md:text-xs font-sans font-bold tracking-[0.3em] uppercase mt-1 text-[#E11D2F]">
                {themeInfo.subtitle}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 font-sans font-bold text-xs tracking-widest uppercase">
            <Link
              href="/"
              className="flex items-center gap-2 text-white hover:text-[#E11D2F] transition-colors"
            >
              <i className="fa-solid fa-clapperboard text-[#E11D2F]" aria-hidden="true" />
              Cartelera
            </Link>
            <Link
              href="/dulceria"
              className="flex items-center gap-2 text-[#a3a3a3] hover:text-white transition-colors"
            >
              <i className="fa-solid fa-bag-shopping text-[#E11D2F]" aria-hidden="true" />
              Dulcería & Combos
            </Link>
            <Link
              href="/preorden"
              className="flex items-center gap-2 bg-[#E11D2F]/15 hover:bg-[#E11D2F] text-white px-3.5 py-1.5 rounded-lg border border-[#E11D2F]/40 transition-all shadow-md"
            >
              <i className="fa-solid fa-qrcode text-[#E11D2F] group-hover:text-white" aria-hidden="true" />
              Pre-orden QR
            </Link>
            <Link
              href="/preorden?tab=tickets"
              className="flex items-center gap-2 text-[#a3a3a3] hover:text-white transition-colors"
              title="Mis Tickets y Compras"
            >
              <i className="fa-solid fa-ticket text-[#E11D2F]" aria-hidden="true" />
              Mis Tickets
            </Link>
          </nav>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]"
              aria-label="Abrir menú"
            >
              <i className={`fa-solid ${isMobileMenuOpen ? 'fa-xmark' : 'fa-bars'} text-lg`} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-[#262626] bg-[#0d0d0d] px-4 pt-3 pb-4 space-y-2 text-xs font-bold uppercase">
          <Link
            href="/"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-white hover:text-[#E11D2F]"
          >
            Cartelera
          </Link>
          <Link
            href="/dulceria"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            Dulcería & Combos
          </Link>
          <Link
            href="/preorden"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            Pre-orden QR
          </Link>
          <Link
            href="/preorden?tab=tickets"
            onClick={() => setIsMobileMenuOpen(false)}
            className="block py-2 text-[#a3a3a3] hover:text-white"
          >
            Mis Tickets
          </Link>
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

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/authService';
import FinancialDashboardView from '@/components/pos/FinancialDashboardView';
import CarteleraAdminView from '@/components/pos/CarteleraAdminView';

export default function DashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'finanzas' | 'cartelera'>('finanzas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState<string>('Administrador');

  // 1. Verificación de sesión y restricción estricta de Administrador (HU-10 Regla 1)
  useEffect(() => {
    const session = authService.getUserSession();
    if (!session) {
      router.push('/login');
      return;
    }
    const rolLower = session.rol?.toLowerCase() || '';
    if (!rolLower.includes('admin')) {
      // Acceso estrictamente restringido a rol Administrador
      router.push('/pos');
      return;
    }
    if (session.nombre) {
      setUserName(session.nombre);
    }
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    router.push('/login');
  };

  return (
    <div className="bg-[#0a0a0a] text-[#f3f4f6] antialiased h-screen flex overflow-hidden selection:bg-[#D81B60] selection:text-white relative font-sans">
      {/* Backdrop para Drawer Móvil */}
      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación lateral"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 z-40 backdrop-blur-sm lg:hidden border-none p-0 w-full h-full cursor-default"
        />
      )}

      {/* Sidebar de Navegación del Panel de Trabajadores */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 lg:w-64 bg-[#111111] border-r border-[#262626] flex flex-col h-full shrink-0 shadow-2xl transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static`}
      >
        {/* Header del Sidebar */}
        <div className="h-20 border-b border-[#262626] flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmU78ReuLCf8T4T3Rv6K8-yAB13kXuZX7_TQ&s"
              alt="Xilotzin Emblem"
              className="h-10 w-10 rounded-full grayscale brightness-125 object-cover border border-[#262626]"
            />
            <div className="flex flex-col">
              <h1 className="text-xl font-serif font-black tracking-widest uppercase leading-none text-white">
                Xilotzin
              </h1>
              <span className="text-[8px] font-sans font-bold tracking-[0.3em] text-[#D81B60] uppercase mt-1">
                Administración
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden text-[#a3a3a3] hover:text-white p-2 rounded-xl bg-[#050505] border border-[#262626]"
            aria-label="Cerrar menú"
          >
            <i className="fa-solid fa-xmark text-sm" />
          </button>
        </div>

        {/* Navegación de Módulos Administrativos */}
        <nav className="flex-grow p-4 flex flex-col gap-2 mt-2 overflow-y-auto">
          {/* HU-10: Dashboard Financiero y Cortes */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('finanzas');
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${
              activeTab === 'finanzas'
                ? 'text-white bg-[#D81B60] shadow-[0_0_15px_rgba(216,27,96,0.3)]'
                : 'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <i className="fa-solid fa-chart-line text-sm" />
            <span>Finanzas & Cortes (HU-10)</span>
          </button>

          {/* Módulo de Películas y Cartelera TMDB */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('cartelera');
              setIsSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-3 rounded-xl font-sans font-bold text-xs uppercase tracking-widest flex items-center gap-3 transition-all ${
              activeTab === 'cartelera'
                ? 'text-white bg-[#D81B60] shadow-[0_0_15px_rgba(216,27,96,0.3)]'
                : 'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]'
            }`}
          >
            <i className="fa-solid fa-film text-sm" />
            <span>Películas & Cartelera TMDB</span>
          </button>

          <div className="pt-4 mt-2 border-t border-[#262626]">
            <span className="px-4 text-[9px] font-mono uppercase text-[#737373] tracking-wider block mb-2">Accesos Rápidos</span>
            <button
              type="button"
              onClick={() => router.push('/pos')}
              className="w-full text-left px-4 py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-widest text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a] flex items-center gap-3 transition-all"
            >
              <i className="fa-solid fa-cash-register text-sm text-[#D81B60]" />
              <span>Terminal POS</span>
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full text-left px-4 py-2.5 rounded-xl font-sans font-bold text-xs uppercase tracking-widest text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a] flex items-center gap-3 transition-all mt-1"
            >
              <i className="fa-solid fa-globe text-sm text-sky-400" />
              <span>Portal Web Público</span>
            </button>
          </div>
        </nav>

        {/* Footer del Sidebar con Rol y Logout */}
        <div className="p-4 border-t border-[#262626] bg-[#050505] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-white font-bold uppercase truncate max-w-[140px]">
              {userName}
            </span>
            <span className="text-[9px] text-[#a3a3a3] uppercase">Rol: Administrador</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[#a3a3a3] hover:text-red-500 text-sm font-bold p-1.5 rounded-lg hover:bg-[#111111] transition-colors"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <i className="fa-solid fa-power-off text-sm" />
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-grow flex flex-col h-full overflow-hidden bg-[#050505] relative">
        {/* Barra Superior */}
        <header className="h-14 border-b border-[#262626] px-4 md:px-8 flex items-center justify-between shrink-0 bg-[#111111] relative z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-xl bg-[#050505] text-white border border-[#262626] active:scale-95 transition-transform"
              aria-label="Abrir menú de navegación"
            >
              <i className="fa-solid fa-bars text-sm" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                {activeTab === 'finanzas' ? 'Módulo Administrativo • Dashboard Financiero' : 'Módulo de Cartelera • Sincronización TMDB'}
              </span>
              <span className="hidden sm:inline-block text-[10px] bg-[#1a1a1a] text-[#a3a3a3] border border-[#333] px-2 py-0.5 rounded font-mono">
                {activeTab === 'finanzas' ? 'HU-10' : 'Catálogo'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>SQL Server 2022 Conectado</span>
            </span>
          </div>
        </header>

        {/* Módulo Principal */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 md:p-8 space-y-8">
          {activeTab === 'finanzas' ? (
            <FinancialDashboardView />
          ) : (
            <CarteleraAdminView />
          )}
        </div>
      </main>
    </div>
  );
}

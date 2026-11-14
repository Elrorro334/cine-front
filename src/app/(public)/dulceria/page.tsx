'use client';

import { useState, useEffect } from 'react';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import CinemaAmbientParticles from '@/components/public/CinemaAmbientParticles';
import DulceriaSection from '@/components/public/DulceriaSection';
import { carteleraService } from '@/services/carteleraService';
import { ProductoDto } from '@/types/api';

export default function DulceriaPage() {
  const [dulceria, setDulceria] = useState<ProductoDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const dulceriaData = await carteleraService.getDulceriaPublica();
        if (isMounted) {
          setDulceria(dulceriaData);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-[#E11D2F] selection:text-white relative overflow-x-hidden">
      <CinemaAmbientParticles />
      <PublicNavbar />

      {/* Hero Oficial Dulcería & Combos (Diseño Xilotzin) */}
      <div className="relative w-full h-[28vh] sm:h-[34vh] md:h-[40vh] flex items-center justify-center overflow-hidden bg-[#0A0A0A] border-b border-[#262626]">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#E11D2F]/25 via-transparent to-white/10" />

        <div className="relative z-10 text-center px-4 sm:px-6">
          <span className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-sans font-bold uppercase tracking-[0.3em] text-[#E11D2F] mb-3">
            <i className="fa-solid fa-bag-shopping" aria-hidden="true" /> Tienda Oficial de Snacks & Dulcería
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-['Playfair_Display',serif] font-black uppercase tracking-tight text-white mb-2 drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]">
            DULCERÍA & <span className="text-[#E11D2F]">COMBOS</span>
          </h1>
          <p className="text-[#A0A0A0] text-[11px] sm:text-xs md:text-sm font-sans tracking-wider uppercase mt-2 font-bold max-w-2xl mx-auto">
            Palomitas calientitas, nachos crujientes, pizzas y refrescos fríos. Disponibles para consumo en sala y Pre-orden QR.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-grow w-full">
        <DulceriaSection products={dulceria} loading={loading} />
      </main>

      <PublicFooter />
    </div>
  );
}

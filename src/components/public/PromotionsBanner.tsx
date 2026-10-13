'use client';

import { useState, useEffect } from 'react';
import { Promotion } from '@/types/cartelera';

interface PromotionsBannerProps {
  readonly promotions: Promotion[];
}

export default function PromotionsBanner({ promotions }: PromotionsBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (promotions.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % promotions.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [promotions.length]);

  if (!promotions || promotions.length === 0) return null;

  const currentPromo = promotions[activeIndex] ?? promotions[0];
  if (!currentPromo) return null;

  return (
    <section id="promociones" className="w-full relative overflow-hidden rounded-3xl border border-[#262626] bg-[#111111] shadow-2xl">
      {/* Background Gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-r ${currentPromo.gradient} opacity-90 transition-all duration-700`}
      />

      {/* Decorative Blur Orbs */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#D81B60]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#F57C00]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#f3f4f6] text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-[#F57C00] animate-pulse" />
            {currentPromo.tag}
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-['Playfair_Display',serif] font-black text-white leading-tight">
            {currentPromo.title}
          </h2>

          <p className="text-xs sm:text-sm text-[#e5e5e5] leading-relaxed">
            {currentPromo.description}
          </p>

          <div className="flex items-center gap-4 pt-2 text-[11px] font-mono text-[#a3a3a3]">
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
              ★ {currentPromo.validity}
            </span>
            <span>•</span>
            <span>Cine Teatro Xilotzin</span>
          </div>
        </div>

        {/* Carousel Indicators / Navigation */}
        <div className="flex md:flex-col items-center gap-2 self-center md:self-auto shrink-0">
          <div className="flex gap-2">
            {promotions.map((promo, idx) => (
              <button
                key={promo.id}
                type="button"
                onClick={() => setActiveIndex(idx)}
                aria-label={`Ver promoción ${promo.title}`}
                className={`transition-all duration-300 rounded-full ${
                  idx === activeIndex
                    ? 'w-8 h-2.5 bg-gradient-to-r from-[#D81B60] to-[#F57C00]'
                    : 'w-2.5 h-2.5 bg-[#404040] hover:bg-neutral-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

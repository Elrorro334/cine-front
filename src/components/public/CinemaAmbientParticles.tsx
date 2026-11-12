'use client';

import React, { useState, useEffect } from 'react';

interface Particle {
  id: number;
  icon: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
  opacity: number;
}

const CLASSIC_PARTICLES: Particle[] = [
  { id: 1, icon: 'fa-solid fa-film text-[#E11D2F]', left: '4%', size: '1.4rem', duration: '9s', delay: '0s', opacity: 0.35 },
  { id: 2, icon: 'fa-solid fa-ticket text-amber-500', left: '12%', size: '1.25rem', duration: '12s', delay: '3s', opacity: 0.3 },
  { id: 3, icon: 'fa-solid fa-clapperboard text-red-500', left: '19%', size: '1.3rem', duration: '14s', delay: '1.5s', opacity: 0.25 },
  { id: 4, icon: 'fa-solid fa-star text-yellow-500', left: '26%', size: '1.6rem', duration: '10s', delay: '5s', opacity: 0.35 },
  { id: 5, icon: 'fa-solid fa-ticket text-amber-500', left: '33%', size: '1.2rem', duration: '13s', delay: '2s', opacity: 0.3 },
  { id: 6, icon: 'fa-solid fa-film text-[#E11D2F]', left: '41%', size: '1.4rem', duration: '8.5s', delay: '4s', opacity: 0.3 },
  { id: 7, icon: 'fa-solid fa-star text-yellow-400', left: '48%', size: '1.1rem', duration: '15s', delay: '0.5s', opacity: 0.25 },
  { id: 8, icon: 'fa-solid fa-video text-neutral-400', left: '55%', size: '1.5rem', duration: '11s', delay: '6s', opacity: 0.3 },
  { id: 9, icon: 'fa-solid fa-ticket text-amber-500', left: '62%', size: '1.25rem', duration: '9.5s', delay: '2.5s', opacity: 0.3 },
  { id: 10, icon: 'fa-solid fa-clapperboard text-[#E11D2F]', left: '69%', size: '1.4rem', duration: '13.5s', delay: '4.5s', opacity: 0.25 },
  { id: 11, icon: 'fa-solid fa-film text-red-500', left: '76%', size: '1.6rem', duration: '10.5s', delay: '1s', opacity: 0.35 },
  { id: 12, icon: 'fa-solid fa-ticket text-amber-500', left: '83%', size: '1.2rem', duration: '12.5s', delay: '5.5s', opacity: 0.3 },
  { id: 13, icon: 'fa-solid fa-video text-neutral-400', left: '89%', size: '1.4rem', duration: '9s', delay: '3.5s', opacity: 0.3 },
  { id: 14, icon: 'fa-solid fa-star text-yellow-500', left: '95%', size: '1.3rem', duration: '11.5s', delay: '7s', opacity: 0.3 },
];

const HALLOWEEN_PARTICLES: Particle[] = [
  { id: 1, icon: 'fa-solid fa-ghost text-orange-400', left: '5%', size: '1.6rem', duration: '8s', delay: '0s', opacity: 0.4 },
  { id: 2, icon: 'fa-solid fa-skull text-purple-400', left: '15%', size: '1.4rem', duration: '11s', delay: '2s', opacity: 0.35 },
  { id: 3, icon: 'fa-solid fa-mask text-emerald-400', left: '25%', size: '1.5rem', duration: '13s', delay: '1s', opacity: 0.3 },
  { id: 4, icon: 'fa-solid fa-spider text-orange-500', left: '35%', size: '1.3rem', duration: '9s', delay: '4s', opacity: 0.4 },
  { id: 5, icon: 'fa-solid fa-ghost text-purple-300', left: '45%', size: '1.7rem', duration: '10s', delay: '3s', opacity: 0.35 },
  { id: 6, icon: 'fa-solid fa-skull text-orange-400', left: '55%', size: '1.5rem', duration: '12s', delay: '0.5s', opacity: 0.35 },
  { id: 7, icon: 'fa-solid fa-moon text-yellow-200', left: '65%', size: '1.4rem', duration: '14s', delay: '5s', opacity: 0.3 },
  { id: 8, icon: 'fa-solid fa-ghost text-emerald-400', left: '75%', size: '1.6rem', duration: '8.5s', delay: '2.5s', opacity: 0.4 },
  { id: 9, icon: 'fa-solid fa-spider text-purple-400', left: '85%', size: '1.3rem', duration: '11.5s', delay: '1.5s', opacity: 0.35 },
  { id: 10, icon: 'fa-solid fa-skull text-orange-400', left: '93%', size: '1.5rem', duration: '9.5s', delay: '4.5s', opacity: 0.35 },
];

const CHRISTMAS_PARTICLES: Particle[] = [
  { id: 1, icon: 'fa-solid fa-snowflake text-white', left: '3%', size: '1.4rem', duration: '6s', delay: '0s', opacity: 0.5 },
  { id: 2, icon: 'fa-solid fa-star text-yellow-300', left: '11%', size: '1.1rem', duration: '7.5s', delay: '1.5s', opacity: 0.45 },
  { id: 3, icon: 'fa-solid fa-snowflake text-cyan-200', left: '19%', size: '1.6rem', duration: '5.5s', delay: '0.8s', opacity: 0.6 },
  { id: 4, icon: 'fa-solid fa-snowflake text-white', left: '27%', size: '1.2rem', duration: '8s', delay: '2s', opacity: 0.4 },
  { id: 5, icon: 'fa-solid fa-star text-amber-200', left: '36%', size: '1.3rem', duration: '6.5s', delay: '3s', opacity: 0.5 },
  { id: 6, icon: 'fa-solid fa-snowflake text-white', left: '44%', size: '1.5rem', duration: '7s', delay: '0.3s', opacity: 0.55 },
  { id: 7, icon: 'fa-solid fa-snowflake text-cyan-100', left: '52%', size: '1.1rem', duration: '5.8s', delay: '2.5s', opacity: 0.45 },
  { id: 8, icon: 'fa-solid fa-star text-yellow-300', left: '60%', size: '1.4rem', duration: '7.2s', delay: '1s', opacity: 0.5 },
  { id: 9, icon: 'fa-solid fa-snowflake text-white', left: '69%', size: '1.6rem', duration: '6.2s', delay: '3.5s', opacity: 0.6 },
  { id: 10, icon: 'fa-solid fa-snowflake text-white', left: '77%', size: '1.2rem', duration: '8.5s', delay: '1.8s', opacity: 0.45 },
  { id: 11, icon: 'fa-solid fa-star text-amber-300', left: '85%', size: '1.3rem', duration: '6.8s', delay: '2.8s', opacity: 0.5 },
  { id: 12, icon: 'fa-solid fa-snowflake text-white', left: '94%', size: '1.5rem', duration: '5.6s', delay: '0.5s', opacity: 0.55 },
];

const MEXICAN_PARTICLES: Particle[] = [
  { id: 1, icon: 'fa-solid fa-flag text-emerald-400', left: '6%', size: '1.4rem', duration: '8s', delay: '0s', opacity: 0.4 },
  { id: 2, icon: 'fa-solid fa-pepper-hot text-red-500', left: '16%', size: '1.3rem', duration: '10s', delay: '1.5s', opacity: 0.4 },
  { id: 3, icon: 'fa-solid fa-star text-yellow-400', left: '26%', size: '1.2rem', duration: '9s', delay: '3s', opacity: 0.35 },
  { id: 4, icon: 'fa-solid fa-champagne-glasses text-pink-400', left: '37%', size: '1.4rem', duration: '11s', delay: '2s', opacity: 0.35 },
  { id: 5, icon: 'fa-solid fa-flag text-red-500', left: '48%', size: '1.5rem', duration: '7.5s', delay: '0.8s', opacity: 0.4 },
  { id: 6, icon: 'fa-solid fa-pepper-hot text-emerald-400', left: '58%', size: '1.3rem', duration: '10.5s', delay: '2.5s', opacity: 0.4 },
  { id: 7, icon: 'fa-solid fa-star text-yellow-300', left: '68%', size: '1.5rem', duration: '8.5s', delay: '4s', opacity: 0.35 },
  { id: 8, icon: 'fa-solid fa-flag text-white', left: '79%', size: '1.4rem', duration: '9.5s', delay: '1s', opacity: 0.45 },
  { id: 9, icon: 'fa-solid fa-champagne-glasses text-amber-300', left: '89%', size: '1.3rem', duration: '11.5s', delay: '3.2s', opacity: 0.35 },
];

export default function CinemaAmbientParticles() {
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
    window.addEventListener('xilotzin_theme_change', updateCurrentTheme);

    return () => {
      window.removeEventListener('xilotzin_theme_change', updateCurrentTheme);
    };
  }, []);

  let particleList = CLASSIC_PARTICLES;
  if (activeTheme === 'halloween') particleList = HALLOWEEN_PARTICLES;
  else if (activeTheme === 'christmas') particleList = CHRISTMAS_PARTICLES;
  else if (activeTheme === 'mexican') particleList = MEXICAN_PARTICLES;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
    >
      <style>{`
        @keyframes cinemaFall {
          0% {
            transform: translateY(-50px) translateX(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: var(--particle-opacity, 0.3);
          }
          90% {
            opacity: var(--particle-opacity, 0.3);
          }
          100% {
            transform: translateY(105vh) translateX(35px) rotate(360deg);
            opacity: 0;
          }
        }
        .cinema-falling-item {
          position: fixed;
          top: -40px;
          animation-name: cinemaFall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          will-change: transform, opacity;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));
        }
      `}</style>

      {particleList.map((p) => (
        <span
          key={`${activeTheme}-${p.id}`}
          className="cinema-falling-item flex items-center justify-center"
          style={
            {
              left: p.left,
              fontSize: p.size,
              animationDuration: p.duration,
              animationDelay: p.delay,
              '--particle-opacity': p.opacity,
            } as React.CSSProperties
          }
        >
          <i className={p.icon} aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}

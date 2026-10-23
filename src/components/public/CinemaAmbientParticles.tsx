'use client';

import React from 'react';

interface Particle {
  id: number;
  icon: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
  opacity: number;
}

const PARTICLES: Particle[] = [
  { id: 1, icon: 'fa-solid fa-film text-[#E11D2F]', left: '4%', size: '1.5rem', duration: '9s', delay: '0s', opacity: 0.35 },
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
  { id: 15, icon: 'fa-solid fa-film text-[#E11D2F]', left: '8%', size: '1.25rem', duration: '16s', delay: '8s', opacity: 0.25 },
  { id: 16, icon: 'fa-solid fa-ticket text-amber-500', left: '22%', size: '1.45rem', duration: '10.5s', delay: '7.5s', opacity: 0.3 },
  { id: 17, icon: 'fa-solid fa-star text-yellow-400', left: '38%', size: '1.1rem', duration: '14s', delay: '9s', opacity: 0.25 },
  { id: 18, icon: 'fa-solid fa-video text-neutral-400', left: '52%', size: '1.6rem', duration: '11s', delay: '8.5s', opacity: 0.3 },
  { id: 19, icon: 'fa-solid fa-ticket text-amber-500', left: '66%', size: '1.3rem', duration: '9.8s', delay: '6.5s', opacity: 0.3 },
  { id: 20, icon: 'fa-solid fa-clapperboard text-[#E11D2F]', left: '80%', size: '1.4rem', duration: '13s', delay: '9.5s', opacity: 0.25 },
  { id: 21, icon: 'fa-solid fa-film text-red-500', left: '92%', size: '1.5rem', duration: '10s', delay: '10s', opacity: 0.3 },
];

export default function CinemaAmbientParticles() {
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

      {PARTICLES.map((p) => (
        <span
          key={p.id}
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
          <i className={p.icon} />
        </span>
      ))}
    </div>
  );
}

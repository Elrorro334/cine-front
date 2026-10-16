'use client';

import React from 'react';

interface Particle {
  id: number;
  symbol: string;
  left: string;
  size: string;
  duration: string;
  delay: string;
  opacity: number;
}

const PARTICLES: Particle[] = [
  { id: 1, symbol: '🍿', left: '4%', size: '1.75rem', duration: '9s', delay: '0s', opacity: 0.55 },
  { id: 2, symbol: '🍿', left: '12%', size: '1.25rem', duration: '12s', delay: '3s', opacity: 0.45 },
  { id: 3, symbol: '🎬', left: '19%', size: '1.4rem', duration: '14s', delay: '1.5s', opacity: 0.4 },
  { id: 4, symbol: '🍿', left: '26%', size: '2rem', duration: '10s', delay: '5s', opacity: 0.6 },
  { id: 5, symbol: '🎟️', left: '33%', size: '1.3rem', duration: '13s', delay: '2s', opacity: 0.5 },
  { id: 6, symbol: '🍿', left: '41%', size: '1.5rem', duration: '8.5s', delay: '4s', opacity: 0.5 },
  { id: 7, symbol: '⭐', left: '48%', size: '1.1rem', duration: '15s', delay: '0.5s', opacity: 0.45 },
  { id: 8, symbol: '🍿', left: '55%', size: '1.8rem', duration: '11s', delay: '6s', opacity: 0.55 },
  { id: 9, symbol: '🍿', left: '62%', size: '1.3rem', duration: '9.5s', delay: '2.5s', opacity: 0.5 },
  { id: 10, symbol: '🎬', left: '69%', size: '1.5rem', duration: '13.5s', delay: '4.5s', opacity: 0.4 },
  { id: 11, symbol: '🍿', left: '76%', size: '2.1rem', duration: '10.5s', delay: '1s', opacity: 0.6 },
  { id: 12, symbol: '🎟️', left: '83%', size: '1.25rem', duration: '12.5s', delay: '5.5s', opacity: 0.45 },
  { id: 13, symbol: '🍿', left: '89%', size: '1.6rem', duration: '9s', delay: '3.5s', opacity: 0.55 },
  { id: 14, symbol: '🍿', left: '95%', size: '1.4rem', duration: '11.5s', delay: '7s', opacity: 0.5 },
  { id: 15, symbol: '🎞️', left: '8%', size: '1.3rem', duration: '16s', delay: '8s', opacity: 0.35 },
  { id: 16, symbol: '🍿', left: '22%', size: '1.65rem', duration: '10.5s', delay: '7.5s', opacity: 0.5 },
  { id: 17, symbol: '⭐', left: '38%', size: '1.2rem', duration: '14s', delay: '9s', opacity: 0.4 },
  { id: 18, symbol: '🍿', left: '52%', size: '1.9rem', duration: '11s', delay: '8.5s', opacity: 0.55 },
  { id: 19, symbol: '🍿', left: '66%', size: '1.4rem', duration: '9.8s', delay: '6.5s', opacity: 0.5 },
  { id: 20, symbol: '🎬', left: '80%', size: '1.5rem', duration: '13s', delay: '9.5s', opacity: 0.4 },
  { id: 21, symbol: '🍿', left: '92%', size: '1.75rem', duration: '10s', delay: '10s', opacity: 0.55 },
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
            opacity: var(--particle-opacity, 0.5);
          }
          90% {
            opacity: var(--particle-opacity, 0.5);
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
          className="cinema-falling-item"
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
          {p.symbol}
        </span>
      ))}
    </div>
  );
}

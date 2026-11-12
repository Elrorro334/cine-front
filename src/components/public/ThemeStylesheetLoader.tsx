'use client';

import { useEffect } from 'react';
import {
  configuracionService,
  THEME_BROADCAST_CHANNEL,
  THEME_CUSTOM_EVENT,
} from '@/services/configuracionService';
import { TematicaSitioDto } from '@/types/configuracion';

const THEME_LINK_ID = 'theme-stylesheet';
const DEFAULT_THEME_HREF = '/css/themes/classic.min.css';
const POLLING_INTERVAL_MS = 15000;

export function isValidStaticThemePath(href?: string | null): href is string {
  if (!href) return false;
  const trimmed = href.trim();
  return trimmed.startsWith('/css/themes/') && trimmed.endsWith('.css');
}

export function applyThemeStylesheet(
  tematica: Pick<TematicaSitioDto, 'rutaArchivoCss' | 'claveIdentificadora'>
): void {
  if (typeof document === 'undefined') return;

  const targetHref = isValidStaticThemePath(tematica.rutaArchivoCss)
    ? tematica.rutaArchivoCss.trim()
    : DEFAULT_THEME_HREF;

  let linkEl = document.getElementById(THEME_LINK_ID) as HTMLLinkElement | null;
  if (!linkEl) {
    linkEl = document.createElement('link');
    linkEl.id = THEME_LINK_ID;
    linkEl.rel = 'stylesheet';
    linkEl.href = targetHref;
    document.head.appendChild(linkEl);
  } else if (linkEl.getAttribute('href') !== targetHref) {
    linkEl.setAttribute('href', targetHref);
  }

  if (tematica.claveIdentificadora) {
    document.documentElement.dataset.cineTheme = tematica.claveIdentificadora;
  }
}

export function broadcastThemeUpdate(tematica: TematicaSitioDto): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent<TematicaSitioDto>(THEME_CUSTOM_EVENT, { detail: tematica }));

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL);
      channel.postMessage(tematica);
      channel.close();
    } catch {
      // Ignorar si BroadcastChannel no está disponible en el navegador
    }
  }
}

function handleRawThemePayload(rawData: string): void {
  try {
    const parsed = JSON.parse(rawData) as TematicaSitioDto;
    if (parsed?.rutaArchivoCss) {
      applyThemeStylesheet(parsed);
    }
  } catch {
    // Ignorar payloads SSE malformados
  }
}

export default function ThemeStylesheetLoader() {
  useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let channel: BroadcastChannel | null = null;

    const syncActiveTheme = async () => {
      try {
        const activa = await configuracionService.getTematicaActiva();
        if (isMounted && activa) {
          applyThemeStylesheet(activa);
        }
      } catch {
        // Mantener hoja de estilos actual si la API no responde temporalmente
      }
    };

    void syncActiveTheme();

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource(configuracionService.getTematicasStreamUrl());
        eventSource.addEventListener('theme-updated', (evt) => {
          const messageEvent = evt as MessageEvent<string>;
          if (isMounted && messageEvent.data) {
            handleRawThemePayload(messageEvent.data);
          }
        });
      } catch {
        eventSource = null;
      }
    }

    const handleCustomEvent = (evt: Event) => {
      const customEvt = evt as CustomEvent<TematicaSitioDto>;
      if (isMounted && customEvt.detail) {
        applyThemeStylesheet(customEvt.detail);
      }
    };
    window.addEventListener(THEME_CUSTOM_EVENT, handleCustomEvent);

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(THEME_BROADCAST_CHANNEL);
        channel.onmessage = (evt: MessageEvent<TematicaSitioDto>) => {
          if (isMounted && evt.data?.rutaArchivoCss) {
            applyThemeStylesheet(evt.data);
          }
        };
      } catch {
        channel = null;
      }
    }

    const pollId = setInterval(() => {
      void syncActiveTheme();
    }, POLLING_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(pollId);
      window.removeEventListener(THEME_CUSTOM_EVENT, handleCustomEvent);
      eventSource?.close();
      channel?.close();
    };
  }, []);

  return null;
}

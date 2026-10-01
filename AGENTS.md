# AGENTS.md — Cine Teatro Xilotzin

**Sistema dual:** POS (Punto de Venta) interno + Landing pública.  
**Estándar 2026:** Desarrollo guiado por IA, supervisado por humanos.

---

## Stack y Estructura

- **Stack:** Next.js 16+ (App Router), React 19, TypeScript strict, Tailwind CSS, `@ducanh2912/next-pwa`
- **Calidad:** SonarQube pipeline (`sonar-project.properties`)
- **Backend:** API REST .NET Core (`cine-back`). Frontend **NO accede directo a BD**, solo via API

```
src/app/
├── (public)/          # Landing, cartelera (sin auth)
├── (pos)/             # POS, inventario, reportes (autenticado)
├── api/               # Route handlers (delegados a .NET)
├── layout.tsx         # Root + providers
└── globals.css        # Tailwind
```

**Regla:** `(public)` y `(pos)` aislan código. Nunca cruzar dependencias sin autorización.

---

## Convenciones

| Aspecto | Regla |
|---------|-------|
| **UI** | Español (textos, comentarios UX) |
| **Código** | Inglés (variables, funciones, interfaces) |
| **Componentes** | Server Components por defecto; `'use client'` solo con estado/eventos |
| **Tipos** | TypeScript strict, prohibido `any` o `@ts-ignore` |
| **Estilos** | Tailwind utilities; CSS personalizado solo si necesario |
| **Estructura** | Colocación: componentes cerca de su uso (carpetas feature) |

---

## Reglas de Dominio (Trampas Conocidas)

### Fechas (CRÍTICO)
- **Siempre:** Fecha local del cine (no UTC)
- **Nunca:** `toISOString()` sin validar zona horaria → horarios se desfasan
- **Usa:** `date-fns` con `es-MX` y función auxiliar

```typescript
// BIEN
const horaLocal = formatInTimeZone(new Date(), 'America/Mexico_City', 'HH:mm');

// MAL
const hora = new Date().toISOString(); // UTC
```

### Arquitectura: Frontend → API .NET Core → BD

**NUNCA:**
- Prisma, Drizzle, o cualquier ORM en el frontend
- Conectar directo a la base de datos desde Server Actions
- Consultas SQL desde Next.js

**SIEMPRE:**
- Todas las operaciones de datos via API REST (`cine-back`)
- Route Handlers (`/api/*`) delegan a .NET Core
- Tipos TypeScript reflejan contratos de API

```typescript
// CORRECTO: Request via API
const response = await fetch(`${API_URL}/peliculas`, {
  headers: { Authorization: `Bearer ${token}` }
});
const peliculas = await response.json();

// INCORRECTO: Acceso directo a BD
import prisma from '@/lib/prisma';
const peliculas = await prisma.pelicula.findMany(); // NO HACER
```

### PWA
- Service Worker + caché configurados en `next.config.ts`
- **NO modificar** sin revisar impacto en versiones anteriores
- Invalida cache tras mutar datos: `revalidatePath('/(pos)/ventas')`

### Route Groups
- No pueden mapear a misma URL: `(public)/about` + `(pos)/about` = conflicto
- Solución: renombra una ruta

### Params Async (Next.js 16+)
```typescript
// CORRECTO
export default async function Page(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
}

// INCORRECTO
const id = props.params.id; // undefined
```

### Datos
- **localStorage:** Solo preferencias UI (tema, filtros)
- **Datos críticos:** API .NET + TanStack Query
- **Secrets:** .env.local, nunca en código
- **Tokens:** httpOnly cookies (backend los gestiona)

---

## Forma de Trabajar

### Flujo: Plan → Ejecutar → Verificar

```
1. /plan              ← Agente propone (sin ejecutar)
2. Tú revisas         ← ¿Arquitectura correcta?
3. /agents            ← Agente ejecuta (escribe código)
4. /diff              ← Revisar cambios
5. npm run build      ← Validar compilación
6. npm run dev        ← Testear en navegador
```

### Siempre
- Validar edge cases (sin datos, entrada inválida, sin permisos)
- TypeScript strict: tipos explícitos
- Modular y reutilizable: una función = una responsabilidad
- Build limpio: `npm run build` sin errores
- SonarQube: resolver issues bloqueantes
- Actualizar MEMORY.md (si existe) tras tareas grandes
- **API-first:** Todos los datos via REST .NET Core

### Pregunta Antes
- Nuevas dependencias (impacto en bundle)
- Cambios en arquitectura raíz (`next.config.ts`, `tsconfig.json`)
- Modificar flujo de CI/CD o SonarQube
- Compartir layouts entre `(public)` y `(pos)`
- Nuevas llamadas a API .NET (validar contrato con backend team)

### Nunca
- Omitir tipos TypeScript (`any`, `@ts-ignore`)
- `console.log()` en producción
- Ignorar SonarQube
- Cruzar Route Groups
- Guardar secrets en código
- Modificar PWA sin validar caché
- **Usar ORM (Prisma, Drizzle) en frontend**
- **Acceder directo a BD desde Server Actions**
- **Saltar API .NET Core**

---

## Verificación

Antes de terminar, asegúrate de:

```bash
npm run build           # Compila sin errores
npm run lint            # ESLint limpio
npm run dev             # Testea en navegador
# DevTools → Application → Service Workers (PWA OK)
# Network tab: verifica que TODO va via API .NET (no consultas SQL)
# Valida: tipado, validación, manejo de errores, responsive
```

**Checklist:**
- [ ] TypeScript strict (sin `any`)
- [ ] Validación con Zod (input, API)
- [ ] Manejo de errores (try/catch, boundaries)
- [ ] Respetar AGENTS.md
- [ ] No cruzar Route Groups
- [ ] Modular + reutilizable
- [ ] Sin `console.log()` en prod
- [ ] Responsive (mobile-first)
- [ ] **Todas las operaciones de datos via API .NET**
- [ ] **Sin ORM o acceso directo a BD**

---

## Stack Complementario (Recomendado)

| Categoría | Tool | Por qué |
|-----------|------|--------|
| Fetch + caché | TanStack Query v5+ | ISR, deduping, invalidación con API |
| Formularios | React Hook Form + Zod | Validación limpia ante API |
| Estado global | Zustand | Ligero, sin Provider Hell |
| HTTP client | Axios o fetch wrapper | Interceptores para auth, errores |

---

## Referencias Rápidas

- **Dinámico:** `app/feature/[id]/page.tsx`
- **Catch-all:** `app/docs/[...slug]/page.tsx`
- **Revalidar:** `revalidatePath('/(pos)/ventas')`
- **Errores:** `app/feature/error.tsx` (Client + `reset()`)
- **Loading:** `app/feature/loading.tsx` (Suspense)
- **API call:** `fetch(`${process.env.NEXT_PUBLIC_API_URL}/endpoint`)`

---

## Próximos Pasos

1. Crear estructura `(public)` / `(pos)` con layouts
2. Setup autenticación (JWT + httpOnly cookie desde .NET)
3. Cartelera pública (fetch via API .NET)
4. POS funcional (ventas, inventario, reportes via API)

---

**Última actualización:** 2026-10-01  
**Versión:** 2.1 (Ejecutivo + Arquitectura .NET separada)

---

## TL;DR (30 segundos)

**DO:** Server Components • TypeScript strict • Fechas locales (América/Mexico_City) • Aislar `(public)` / `(pos)` • Plan mode para grandes tareas • **API-first: .NET Core maneja BD**

**DON'T:** `any` type • `console.log()` en prod • Ignorar SonarQube • Cruzar Route Groups • Secrets en código • **ORM en frontend • Acceso directo a BD • Saltarse API .NET**

**START:** `npm run dev` → `/plan` (OpenCode) → `npm run build` (validar) → Network tab: verificar API .NET

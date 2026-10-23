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
| **Lógica** | **CERO LÓGICA DE NEGOCIO EN NEXT.JS.** Next.js es una capa de presentación pura (*Dumb UI / Presentation-Only*). Prohibido procesar ventas en memoria, generar folios, calcular estados de asientos o inventarios. Toda la lógica reside exclusivamente en el Backend .NET Core y SQL Server |
| **Datos** | **100% DINÁMICOS.** Cero datos hardcodeados, simulados, mocks o fallbacks. Todo via API .NET Core |
| **Gráficos / UI** | **PROHIBIDO EL USO DE EMOJIS.** Usar íconos vectoriales (FontAwesome `<i className="fa-solid ...">` o SVGs) |

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

### Cero Datos Hardcodeados / Simulados (REGLA DE ORO)
- **ESTRICTAMENTE PROHIBIDO:**
  - `fallbackCatalog`, mocks estáticos, arrays en memoria simulando registros de base de datos.
  - Credenciales hardcodeadas, usuarios ficticios o botones de demo prellenada.
  - Generadores de datos falsos o datos de relleno (*dummy data*) para evitar mostrar listas vacías.
- **SIEMPRE:**
  - Todos los datos (películas, salas, butacas, funciones, promociones, dulcería, inventario) deben provenir en tiempo real de la base de datos SQL Server (`cineDataBase`) a través de la API REST .NET Core (`cine-back`).
  - Si una tabla o endpoint devuelve una lista vacía (`[]`) o un recurso no existe, la UI debe mostrar un estado vacío legítimo (*Empty State*) o mensaje informativo claro, NUNCA inventar datos.

### Cero Lógica de Negocio en Next.js (ARQUITECTURA DUMB-UI / PRESENTATION-ONLY)
- **ESTRICTAMENTE PROHIBIDO:**
  - Implementar lógica de negocio, reglas contables, generadores de folios de venta (ej. `VT-XXXX` con `crypto.getRandomValues`), cálculos de disponibilidad de butacas, reglas de descuento de inventario o validaciones de promociones dentro de Next.js.
  - Almacenar carritos o estados de venta como "ventas completadas" en memoria o LocalStorage sin haber sido procesadas y persistidas por el backend.
  - Asumir o simular cálculos de cobro, totales con impuestos, folios de tickets o estados ocupados en el cliente.
- **SIEMPRE:**
  - **Next.js es únicamente capa de presentación:** Se limita a renderizar los datos que la API REST entrega y a despachar las acciones del usuario directamente al backend de .NET Core.
  - **El Backend .NET Core es la única autoridad:**
    - Genera y asigna los folios oficiales de venta (`VT-00001`, etc.) a través de transacciones ACID en SQL Server.
    - Administra el estado real de los asientos (`estado_butaca_funcion`).
    - Descuenta existencias en la tabla `producto` (`stock_actual`).
    - Valida códigos QR y pre-órdenes.
  - Toda mutación o venta debe enviarse a `POST /api/taquilla/venta` y recibir la confirmación de la base de datos antes de mostrar el ticket o limpiar el carrito.

### Prohibición Estricta de Emojis en el Diseño e Interfaz (REGLA DE DISEÑO)
- **ESTRICTAMENTE PROHIBIDO:**
  - El uso de emojis o caracteres pictográficos Unicode (ejemplos: 🍿, 🎬, 🎟️, 📢, ✨, 🗑, 💾, ✕, ✓, ★, ⚠️, ⏻) en cualquier parte de la interfaz de usuario, modales, botones, banners, badges o textos informativos.
- **SIEMPRE:**
  - Todo elemento gráfico, decorativo, indicador de estado o acción debe implementarse con **íconos vectoriales**:
    - **FontAwesome:** `<i className="fa-solid fa-ticket" />`, `<i className="fa-solid fa-star" />`, `<i className="fa-solid fa-check" />`, etc.
    - **SVGs inline:** Con atributos accesibles como `aria-hidden="true"`.
- **Razón:** Consistencia visual profesional, fidelidad estética de marca corporativa y compatibilidad multiplataforma sin depender de las fuentes de emojis del sistema operativo.

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
- **Usar emojis en la interfaz de usuario (usar siempre íconos vectoriales FontAwesome o SVG)**
- **Hardcodear, simular o inventar datos (cero fallbacks o mocks; todo 100% dinámico desde BD via API)**

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
- [ ] **Cero datos hardcodeados o simulados (100% dinámico desde BD via API)**
- [ ] **Cero emojis en la UI (todos reemplazados por íconos vectoriales FontAwesome / SVG)**

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

**DON'T:** `any` type • `console.log()` en prod • Ignorar SonarQube • Cruzar Route Groups • Secrets en código • **ORM en frontend • Acceso directo a BD • Saltarse API .NET • Emojis en UI • Mocks, fallbacks o datos hardcodeados**

**START:** `npm run dev` → `/plan` (OpenCode) → `npm run build` (validar) → Network tab: verificar API .NET

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

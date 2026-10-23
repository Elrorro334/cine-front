# Cine Teatro Xilotzin — Frontend PWA & POS (`cine_xilotzin`)

Frontend oficial del **Cine Teatro Xilotzin**. Aplicación web progresiva (PWA) de alto rendimiento que combina una **Landing Page pública** (cartelera, sinopsis y promociones) con un **Punto de Venta interno (POS)** y **Dashboard Financiero/Administrativo** para el personal de taquilla y gerencia.

Construido bajo el paradigma de **Presentación Pura (*Dumb UI / Presentation-Only*)**, donde el frontend delega el 100% de la lógica de negocio, reglas contables, control de stock y persistencia transaccional al backend oficial en **.NET 10.0 Web API** (`cine-back`) y **SQL Server 2022**.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.8-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![SonarQube Cloud](https://sonarcloud.io/api/project_badges/measure?project=elrorro334_cine-front&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=elrorro334_cine-front)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=elrorro334_cine-front&metric=coverage)](https://sonarcloud.io/summary/new_code?id=elrorro334_cine-front)
[![Azure Static Web Apps](https://img.shields.io/badge/Deploy-Azure%20Static%20Web%20Apps-0078D4?logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/products/app-service/static/)

---

## 📑 Tabla de Contenidos

1. [Principios y Reglas de Dominio](#-principios-y-reglas-de-dominio)
2. [Estructura del Proyecto (App Router)](#-estructura-del-proyecto-app-router)
3. [Módulos del Sistema](#-módulos-del-sistema)
4. [Integración con el Backend .NET Core (`cine-back`)](#-integración-con-el-backend-net-core-cine-back)
5. [PWA y Soporte para Terminales Táctiles](#-pwa-y-soporte-para-terminales-táctiles)
6. [Requisitos Previos y Variables de Entorno](#-requisitos-previos-y-variables-de-entorno)
7. [Scripts Disponibles y Ejecución Local](#-scripts-disponibles-y-ejecución-local)
8. [Suite de Pruebas Unitarias y Cobertura](#-suite-de-pruebas-unitarias-y-cobertura)
9. [Calidad de Código y SonarCloud](#-calidad-de-código-y-sonarcloud)
10. [Despliegue Continuo (CI/CD)](#-despliegue-continuo-cicd)

---

## 🏛 Principios y Reglas de Dominio

El desarrollo del frontend se rige de manera estricta por las políticas institucionales definidas en `AGENTS.md`:

### 1. Cero Lógica de Negocio en Next.js (*Dumb UI Architecture*)
* **El Backend .NET Core es la única autoridad:** Ningún cálculo contable, total con impuestos, descuento promocional, validación de inventario, cambio de estado de butacas o generación de folios (`VT-XXXXX`) se realiza en el cliente.
* **Flujo Transaccional:** La interfaz recopila los ítems seleccionados y despacha la orden a la API (`POST /api/taquilla/venta`). Solo tras recibir confirmación HTTP 200 y el DTO persistido en base de datos, se despliega el ticket de venta o se limpia el carrito.
* Prohibido almacenar ventas en memoria o `localStorage` simulando confirmación local.

### 2. Cero Datos Hardcodeados o Simulados (100% Dinámico)
* **Cero Mocks o Fallbacks:** La interfaz no incluye catálogos falsos, datos de relleno (*dummy data*) ni usuarios de demostración.
* Si un recurso o listado regresa vacío (`[]`), la UI presenta un estado vacío (*Empty State*) formal y accesible con retroalimentación clara.

### 3. Prohibición Absoluta de Emojis Unicode en UI
* Por directriz corporativa y consistencia visual multiplataforma, queda estrictamente prohibido el uso de emojis Unicode (ej. 🎟️, 🍿, 🎬, ✕, ✓, ⚠️, 🗑).
* Todo ícono de acción, estado, notificación o branding se renderiza mediante **íconos vectoriales FontAwesome** (`<i className="fa-solid fa-ticket" />`) o **SVGs accesibles**.

### 4. Manejo Estricto de Horarios y Fechas Locales
* Toda visualización y filtro de cartelera opera en la zona horaria oficial del cine: `America/Mexico_City`.
* Se evita el uso de `toISOString()` sin conversión previa para prevenir desfases de fecha y proyecciones de medianoche.

---

## 📁 Estructura del Proyecto (App Router)

Organización modular con separación total de contextos públicos y privados mediante **Route Groups**:

```
cine_xilotzin/
├── public/                            # Favicon, manifiesto PWA, logos vectoriales y assets
├── src/
│   ├── app/
│   │   ├── (public)/                  # [Portal Público] Cartelera, sinopsis, promociones
│   │   │   ├── page.tsx               # Landing page con cartelera dinámica
│   │   │   └── page.test.tsx          # Pruebas del portal público
│   │   ├── (pos)/                     # [Punto de Venta & Administración]
│   │   │   ├── pos/                   # Terminal POS (Taquilla & Dulcería)
│   │   │   │   ├── page.tsx           # Flujo de venta y despacho de órdenes
│   │   │   │   └── page.test.tsx      # Pruebas de la terminal POS
│   │   │   └── dashboard/             # Dashboard Financiero y Catálogo TMDB
│   │   │       ├── page.tsx           # KPIs semanales, reportes y registro de películas
│   │   │       └── page.test.tsx      # Pruebas del dashboard administrativo
│   │   ├── login/                     # Autenticación y verificación de perímetro
│   │   │   ├── page.tsx               # Login de taquilleros y administradores
│   │   │   └── page.test.tsx          # Pruebas de validación de credenciales
│   │   ├── layout.tsx                 # Root Layout y metadatos de aplicación
│   │   └── globals.css                # Configuración de estilos globales y utilidades
│   │
│   ├── components/                    # Componentes modulares y reutilizables
│   │   ├── FinancialDashboardView.tsx # Vista interactiva de KPIs y desglose financiero
│   │   ├── SeatMapModal.tsx           # Mapa interactivo de selección de butacas
│   │   ├── ThermalTicketModal.tsx     # Modal de impresión de ticket térmico oficial
│   │   ├── QrScannerModal.tsx         # Lector de códigos QR para preórdenes web
│   │   ├── TmdbRegisterModal.tsx      # Modal de búsqueda y alta de películas desde TMDB
│   │   └── public/                    # Componentes exclusivos de la landing pública
│   │       ├── MovieCard.tsx          # Tarjeta de película con póster y géneros
│   │       ├── MovieDetailModal.tsx   # Modal de sinopsis, tráiler y horarios
│   │       ├── PromotionsBanner.tsx   # Banner de ofertas y avisos dinámicos
│   │       ├── PublicNavbar.tsx       # Navegación superior con selector de fecha
│   │       ├── PublicFooter.tsx       # Pie de página institucional
│   │       └── CinemaAmbientParticles.tsx # Efecto visual atmosférico para el portal
│   │
│   ├── lib/                           # Capa de infraestructura y utilidades cliente
│   │   ├── apiClient.ts               # Wrapper fetch con inyección de Bearer JWT y descarga de blobs
│   │   └── tmdb.ts                    # Resolución de rutas CDN de pósters y backdrops de TMDB
│   │
│   ├── services/                      # Servicios desacoplados de consumo a la API REST
│   │   ├── authService.ts             # Login y verificación de red local (/api/Auth)
│   │   ├── carteleraService.ts        # Cartelera, promociones y TMDB (/api/cartelera)
│   │   ├── taquillaService.ts         # Butacas, dulcería, preórdenes y ventas (/api/taquilla)
│   │   └── dashboardService.ts        # Resumen financiero, semanas y CSV (/api/dashboard)
│   │
│   └── types/                         # Definiciones de tipos TypeScript en espejo con .NET
│       ├── api.ts                     # DTOs de login, ventas, butacas, KPIs y transacciones
│       └── cartelera.ts               # Contratos de películas, funciones y salas
│
├── .github/workflows/                 # Workflows de CI/CD (SonarCloud y Azure Static Web Apps)
├── jest.config.mjs                    # Configuración de pruebas unitarias Jest con jsdom
├── next.config.ts                     # Configuración de Next.js, exportación estática y PWA
├── sonar-project.properties           # Parámetros del proyecto en SonarQube Cloud
└── staticwebapp.config.json           # Rutas y fallback SPA para Azure Static Web Apps
```

---

## 💻 Módulos del Sistema

### 1. Portal Público (`(public)`)
* **Cartelera en Vivo:** Consulta las proyecciones activas para el día actual o fechas seleccionadas sin requerir inicio de sesión.
* **Detalle Enriquecido:** Muestra sinopsis oficial, clasificación por edad, duración, elenco y fondo cinematográfico resuelto a través de The Movie Database (TMDB).
* **Promociones Dinámicas:** Carrusel de anuncios y promociones cargados directamente desde la base de datos.
* **Experiencia Inmersiva:** Incluye `CinemaAmbientParticles` para generar una atmósfera temática cinematográfica en pantallas de alta resolución.

### 2. Punto de Venta POS (`(pos)/pos`)
* **Venta Combinada (Taquilla + Dulcería):** Procesa boletos de cine y productos de dulcería en una sola orden transaccional.
* **Mapa de Asientos en Tiempo Real (`SeatMapModal`):** Renderizado dinámico de la distribución de la sala. Consulta el estado real de cada butaca (`disponible`, `ocupada`, `seleccionada`) consultando `estado_butaca_funcion` en SQL Server.
* **Catálogo de Dulcería con Stock:** Lista los combos y golosinas disponibles impidiendo agregar ítems que superen el `stock_actual`.
* **Validación de Preórdenes por QR (`QrScannerModal`):** Permite a los clientes canjear órdenes generadas en línea escaneando su código QR desde la cámara de la terminal.
* **Emisión de Ticket Térmico (`ThermalTicketModal`):** Genera el comprobante oficial con código QR de verificación, desglose de asientos y productos, folio oficial `VT-XXXXX` y botón de impresión directa hacia impresoras POS de 80mm.

### 3. Dashboard Financiero y Catálogo (`(pos)/dashboard`)
* **4 KPIs Gerenciales:** Ingresos totales de la semana, ingresos por taquilla, ingresos por dulcería y proporción de cobro Efectivo vs. Tarjeta.
* **Semana Cinematográfica:** Filtro inteligente alineado con el ciclo oficial de la industria del cine (Jueves a Miércoles).
* **Exportación Contable:** Descarga de reportes en formato CSV estructurado con codificación UTF-8 BOM para apertura directa en Microsoft Excel sin problemas de tildes o caracteres especiales.
* **Gestión de Películas con TMDB (`TmdbRegisterModal`):** Búsqueda de películas en TMDB v3 por título, selección de sala, asignación de horarios de función y alta en base de datos.
* **Baja de Películas:** Retiro controlado de películas y sus funciones programadas de la cartelera activa.

### 4. Seguridad y Perímetro de Red (`/login`)
* **Doble Validación de Acceso:**
  1. Comprobación de que la IP del cliente pertenezca al rango de red local autorizado del complejo cinematográfico (`/api/Auth/check-network`). Si el operador no está en la red física del cine, el acceso se bloquea con HTTP 403.
  2. Autenticación con credenciales cifradas y retorno de token JWT almacenado de forma segura.

---

## 🔌 Integración con el Backend .NET Core (`cine-back`)

Toda la comunicación de datos fluye a través de `src/lib/apiClient.ts` hacia el servidor backend:

| Servicio Frontend | Endpoint Backend Consumido | Método | Autenticación | Función Operativa |
| :--- | :--- | :---: | :---: | :--- |
| `authService.checkNetwork` | `/api/Auth/check-network` | `GET` | No | Verifica que la terminal se encuentre dentro del perímetro físico del cine. |
| `authService.login` | `/api/Auth/login` | `POST` | No | Autentica al cajero/administrador y retorna el JWT. |
| `carteleraService.getCartelera` | `/api/cartelera` | `GET` | No | Consulta las películas y funciones activas del día. |
| `carteleraService.getPromociones` | `/api/cartelera/promociones` | `GET` | No | Obtiene los banners y promociones vigentes. |
| `carteleraService.buscarTmdb` | `/api/cartelera/buscar-tmdb` | `GET` | Sí (JWT) | Búsqueda por título en TMDB intermediada por el backend. |
| `carteleraService.getDetalleTmdb` | `/api/cartelera/detalle-tmdb/{id}` | `GET` | Sí (JWT) | Obtiene sinopsis, póster, backdrop y reparto de TMDB. |
| `carteleraService.registrarPelicula` | `/api/cartelera/registrar` | `POST` | Sí (JWT) | Da de alta la película y sus funciones en la base de datos. |
| `carteleraService.darDeBajaPelicula` | `/api/cartelera/pelicula/{id}` | `DELETE` | Sí (JWT) | Retira la película de la cartelera activa. |
| `taquillaService.getCarteleraPos` | `/api/taquilla/cartelera` | `GET` | Sí (JWT) | Cartelera especializada para la terminal de ventas. |
| `taquillaService.getButacasFuncion` | `/api/taquilla/funciones/{id}/butacas` | `GET` | Sí (JWT) | Consulta el estado de ocupación de las butacas de una función. |
| `taquillaService.getProductosDulceria`| `/api/taquilla/dulceria` | `GET` | Sí (JWT) | Catálogo de dulcería con existencias en tiempo real. |
| `taquillaService.registrarVenta` | `/api/taquilla/venta` | `POST` | Sí (JWT) | Transacción ACID de confirmación de venta, asientos y stock. |
| `taquillaService.getPreorden` | `/api/taquilla/preorden/{codigoQr}` | `GET` | Sí (JWT) | Recupera los detalles de una pre-orden mediante su QR. |
| `dashboardService.getDashboard` | `/api/dashboard/resumen` | `GET` | Sí (Admin) | Consulta los KPIs financieros y transacciones por semana. |
| `dashboardService.getSemanaActual` | `/api/dashboard/semana-actual` | `GET` | Sí (Admin) | Rango de fechas de la semana cinematográfica actual. |
| `dashboardService.exportarCsv` | `/api/dashboard/exportar-transacciones` | `GET` | Sí (Admin) | Descarga el archivo binario CSV con UTF-8 BOM. |

---

## 📱 PWA y Soporte para Terminales Táctiles

La aplicación está completamente optimizada para instalarse como una aplicación de escritorio o tableta en las terminales del cine:

* **Configuración PWA:** Gestionada en `next.config.ts` mediante `@ducanh2912/next-pwa`.
* **Caché Inteligente:** Almacenamiento local de assets estáticos y fuentes vectoriales para garantizar arranques instantáneos sin recargas innecesarias de red.
* **Exportación Estática:** Se compila con `output: "export"` generando el directorio distribuible `out/` listo para CDN y Azure Static Web Apps.
* **Diseño Ergonómico Touch:** Botones de taquilla y butacas calibrados con dimensiones táctiles recomendadas ($\ge 44 \times 44\text{ px}$) para uso ágil y sin fatiga por parte de los cajeros.

---

## ⚙️ Requisitos Previos y Variables de Entorno

### Requisitos:
* **[Node.js](https://nodejs.org/)** v20.x LTS o superior.
* Gestor de paquetes **npm** (v10+).
* Instancia en ejecución del backend **`cine-back`** (por defecto en `http://localhost:5203` o `https://localhost:7088`).

### Configuración de Entorno Local:
Crea un archivo `.env.local` en la raíz del proyecto tomando como referencia `.env.example`:

```bash
# URL base hacia la API REST de .NET Core
NEXT_PUBLIC_API_URL=http://localhost:5203/api
```

---

## 🚀 Scripts Disponibles y Ejecución Local

En la raíz del proyecto puedes ejecutar:

```bash
# 1. Instalar dependencias del proyecto
npm install

# 2. Iniciar el servidor de desarrollo
npm run dev

# 3. Compilar para producción y generar el directorio estático out/
npm run build

# 4. Validar reglas de estilo y tipado con ESLint
npm run lint

# 5. Ejecutar la suite de pruebas unitarias
npm test

# 6. Ejecutar pruebas unitarias en modo interactivo (watch)
npm run test:watch

# 7. Ejecutar pruebas y generar reporte de cobertura de código
npm run test:coverage
```

La aplicación en desarrollo estará disponible en: `http://localhost:3000`

---

## 🧪 Suite de Pruebas Unitarias y Cobertura

El proyecto cuenta con una cobertura integral de pruebas sobre componentes y servicios utilizando **Jest** y **React Testing Library**:

* **Mocks de Red:** Pruebas desacopladas utilizando simulación de `fetch` y `localStorage`.
* **Casos Críticos Probados:**
  - Renderizado dinámico de la cartelera pública sin errores de hidratación.
  - Flujo de login: validación de campos, restricción de red remota (403) y almacenamiento de token.
  - Selección de butacas en `SeatMapModal` respetando asientos ocupados.
  - Despacho y cálculo de ventas en la terminal POS.
  - Renderizado de métricas y gráficos del Dashboard Financiero (`FinancialDashboardView`).
  - Resolución correcta de URLs relativas y absolutas en `tmdb.ts`.

Para consultar la cobertura localmente:
```bash
npm run test:coverage
```
El reporte se generará en la carpeta `coverage/` y el archivo `coverage/lcov.info` será consumido por SonarCloud.

---

## 🔍 Calidad de Código y SonarCloud

El repositorio está integrado con **SonarQube Cloud** bajo la clave de proyecto `elrorro334_cine-front`:

* **Criterios de Aprobación (Quality Gate):**
  - **0** Bugs.
  - **0** Vulnerabilidades de seguridad.
  - **0** Security Hotspots abiertos.
  - **Cobertura de Pruebas $\ge$ 80%** en código nuevo.
  - Calificación de Mantenibilidad **A** (duplicación < 3%).

El pipeline está automatizado en `.github/workflows/sonar.yml` y se dispara con cada `push` a las ramas `develop` o `Sprint*` y en la apertura de Pull Requests.

---

## 🌐 Despliegue Continuo (CI/CD)

El frontend se despliega automáticamente en **Azure Static Web Apps** mediante el flujo configurado en `.github/workflows/azure-static-web-apps.yml`:

1. Al realizar `push` a la rama `main`, el workflow instala las dependencias con `npm install`.
2. Compila el frontend estático inyectando la variable `NEXT_PUBLIC_API_URL`.
3. Sube el directorio generado `out/` a la infraestructura de Azure de forma global con caché CDN y certificados SSL automáticos.
4. Las reglas de enrutamiento y soporte SPA para recargas en rutas profundas están definidas en `staticwebapp.config.json`.

---

## 📄 Licencia y Derechos

Desarrollado para el sistema operativo y comercial del **Cine Teatro Xilotzin**. Todos los derechos reservados.

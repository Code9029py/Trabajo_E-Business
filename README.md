# V-TECH React

Sitio frontend de V-TECH construido con React y Vite. Incluye Inicio/Nosotros, Catálogo, Contacto, panel `/admin`, productos desde Google Sheets mediante Apps Script, imágenes desde Google Drive, varias imágenes por producto, precio, carrito de consulta, favoritos locales y colores personalizados.

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La app queda disponible en:

```text
http://127.0.0.1:5173
```

## Variables de entorno

Crear un archivo `.env` local a partir de `.env.example`. No subir `.env` al repositorio.

```env
VITE_PRODUCTOS_API_MODO=remoto
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/XXXXXXXX/exec
VITE_ADMIN_API_TOKEN=CAMBIAR_POR_TOKEN_REAL
VITE_ADMIN_USER=CAMBIAR_POR_USUARIO_ADMIN
VITE_ADMIN_PASSWORD=CAMBIAR_POR_PASSWORD_ADMIN
```

Valores principales:

- `VITE_PRODUCTOS_API_MODO`: `local` usa datos base/localStorage; `remoto` usa Apps Script.
- `VITE_APPS_SCRIPT_URL`: URL publicada del Web App de Apps Script.
- `VITE_ADMIN_API_TOKEN`: token enviado a Apps Script para acciones administrativas.
- `VITE_ADMIN_USER` y `VITE_ADMIN_PASSWORD`: acceso visual básico al panel `/admin`.

## Build

```bash
npm run build
```

El resultado se genera en `dist/`.

## Deploy portable

### A) Deploy genérico

```bash
npm install
npm run build
```

Subir el contenido de `dist/` al hosting elegido.

### B) Cloudflare Pages

- Framework preset: React/Vite.
- Build command: `npm run build`.
- Output directory: `dist`.
- Configurar las variables `VITE_PRODUCTOS_API_MODO`, `VITE_APPS_SCRIPT_URL`, `VITE_ADMIN_API_TOKEN`, `VITE_ADMIN_USER` y `VITE_ADMIN_PASSWORD`.

### C) Vercel / Netlify

- Build command: `npm run build`.
- Output directory: `dist`.
- Configurar las mismas variables de entorno `VITE_*`.
- Para Netlify, `public/_redirects` mantiene el fallback SPA.

### D) Hosting tradicional, cPanel, Hostinger o servidor propio

Ejecutar `npm run build` y subir el contenido de `dist/`.

Para rutas SPA como `/catalogo`, `/contacto` y `/admin`, el servidor debe devolver `index.html` cuando no encuentre un archivo físico:

- Cloudflare Pages y Netlify usan `public/_redirects`.
- Apache/cPanel puede usar `public/.htaccess`, incluido en este proyecto.
- Nginx puede requerir `try_files`.
- Algunos paneles de hosting tienen una opción de fallback o rewrite hacia `index.html`.

## Rutas SPA

El proyecto incluye:

```text
public/_redirects
```

con:

```text
/* /index.html 200
```

Esto ayuda en Cloudflare Pages y Netlify. En otros hostings se debe configurar el fallback equivalente.

## Panel admin

Entrar a:

```text
http://127.0.0.1:5173/admin
```

Desde `/admin` se pueden crear, editar, ocultar, reactivar y eliminar definitivamente productos. La eliminación definitiva está permitida solo para productos ocultos.

El login del frontend es un control básico de acceso visual. No reemplaza una autenticación real de backend.

## Productos y catálogo

El catálogo usa `src/services/productosService.js`. Puede funcionar en modo local o remoto según `src/config/apiConfig.js` y las variables de entorno:

- `local`: usa productos base de `src/data/products.js` y guarda cambios simulados en `localStorage`.
- `remoto`: consulta Google Sheets mediante Apps Script.

Los productos públicos se filtran por `activo === true`. Los productos ocultos siguen visibles en `/admin`, pero no aparecen en el catálogo público.

## Campos de producto

El modelo mantiene compatibilidad con productos antiguos que solo tienen `imagenUrl`.

- `precio`: texto opcional. Si contiene un número, el catálogo lo muestra como `Gs. 120.000`. Si está vacío, muestra `Precio a consultar`.
- `imagenUrl`: imagen principal o fallback para productos antiguos.
- `imagenes`: lista de imágenes del producto. Si tiene elementos, el catálogo y el admin la usan como galería. Si está vacía, se usa `imagenUrl`.
- `colores`: lista de strings, por ejemplo `["Verde petróleo", "Azul marino"]`.

Todas las imágenes pasan por `normalizarImagenUrl`, que convierte enlaces compartidos de Google Drive a:

```text
https://drive.google.com/thumbnail?id=ID&sz=w700
```

## Google Sheets

La hoja `productos` debe tener estas columnas:

```text
id, nombre, categoria, subcategoria, tipo, descripcionCorta, descripcionLarga,
colores, talles, medidas, caracteristicas, propiedades, estadoStock, precio,
activo, destacado, imagenUrl, imagenes, fechaCreacion, fechaActualizacion
```

La hoja `colores` debe tener estas columnas:

```text
id, nombre, slug, hex, activo, fechaCreacion, fechaActualizacion
```

El Apps Script actualizado puede crear la hoja `colores` automáticamente si no existe.

Formato de `imagenes`: varias URLs separadas por `|`.

```text
https://drive.google.com/file/d/ID_1/view|https://drive.google.com/file/d/ID_2/view
```

Formato recomendado de `precio`:

```text
120000
```

## Carrito, favoritos y colores

El carrito de consulta usa `localStorage` con la clave:

```text
vtech_cart
```

Los favoritos locales usan:

```text
vtech_favorites
```

Los colores personalizados se cargan desde la hoja global `colores`. Si un color no existe allí, el catálogo intenta resolverlo con el mapa base interno. Si tampoco existe, usa gris fallback.

## Apps Script

El script remoto está en `apps-script/productos.gs`.

Antes de producción:

- Copiar el contenido actualizado de `apps-script/productos.gs` en el editor de Apps Script real.
- Reemplazar `ADMIN_API_TOKEN` en Apps Script por un token real y seguro.
- Configurar el mismo token en `VITE_ADMIN_API_TOKEN` o, idealmente, en una capa backend/proxy privada.
- Configurar `VITE_APPS_SCRIPT_URL` con la URL publicada del Web App de Apps Script.
- Guardar el proyecto de Apps Script.
- Ir a Deploy > Manage deployments.
- Editar el Web App existente o crear una nueva versión.
- Mantener el acceso del Web App igual que el despliegue actual.

Apps Script soporta las acciones:

```text
listar, crear, editar, ocultar, reactivar, eliminarDefinitivo,
listarColores, crearColor, editarColor, ocultarColor, reactivarColor
```

## Seguridad y consideraciones de producción

Este proyecto es una app frontend estática. Las variables `VITE_*` se inyectan en el bundle final y pueden ser visibles desde el navegador. Por eso:

- `VITE_ADMIN_API_TOKEN` no es un secreto fuerte si vive en el frontend.
- `VITE_ADMIN_USER` y `VITE_ADMIN_PASSWORD` tampoco son credenciales fuertes.
- El login de `/admin` sirve como control básico de acceso visual, no como seguridad real.
- Apps Script valida token para operaciones administrativas y debe mantener esa validación.

Para seguridad real en producción se recomienda agregar una capa backend/proxy entre el frontend y Apps Script. Esa capa puede implementarse con:

- Cloudflare Pages Functions.
- Vercel Serverless Functions.
- Netlify Functions.
- Firebase Functions.
- Servidor Node/Express.
- Backend propio del negocio.

El proxy debería guardar `APPS_SCRIPT_URL` y `ADMIN_API_TOKEN` en variables privadas del servidor. El frontend debería llamar al proxy, no directamente a Apps Script.

Para esta entrega, el proyecto queda portable y listo para que el equipo técnico del negocio decida dónde desplegarlo.

## Limpieza de entrega

Para entregar el código fuente, no es necesario incluir `node_modules/` ni `dist/`. El equipo técnico puede regenerar la versión publicada con:

```bash
npm install
npm run build
```

Los errores técnicos controlados se registran solo en modo desarrollo mediante `src/utils/logger.js`; en producción no se imprimen detalles innecesarios en la consola del navegador.

## Contacto

El sitio usa estos datos principales:

- Email: `Ventas@vtech.com.py`
- WhatsApp: configurado en `src/utils/whatsapp.js`
- Instagram y Threads: configurados en `src/pages/ContactPage.jsx`

El email se muestra en Contacto con enlace `mailto:Ventas@vtech.com.py`.

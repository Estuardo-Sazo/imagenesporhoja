# Imágenes por Hoja

Herramienta web gratuita para **acomodar automáticamente varias imágenes en una sola hoja**
lista para imprimir. Eliges cuántas imágenes quieres por página y el motor calcula el tamaño y
la posición que mejor aprovechan el papel, sin deformar nada y respetando los márgenes.

Todo el procesamiento ocurre **dentro del navegador**: las imágenes nunca se suben a un servidor.

- Landing con la explicación del producto (`/`)
- Herramienta (`/herramienta`)
- Salida a impresión, PDF y Word (`.docx`)

## Requisitos

- Node.js 20.3 o superior

## Puesta en marcha

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:4321
npm run build    # genera el sitio estático en dist/
npm run preview  # sirve dist/ para revisar el resultado final
npm test         # pruebas del motor de acomodo y del generador de .docx
```

## Estructura

```
src/
├── components/
│   ├── landing/     Secciones de la portada (hero, problema, pasos, FAQ…)
│   ├── layout/      Cabecera, pie y hueco reservado para publicidad
│   ├── seo/         Metadatos y datos estructurados
│   └── tool/        Isla de React con la herramienta
├── layouts/         Plantilla base de las páginas
├── lib/
│   ├── config/      Configuración del sitio, FAQ y publicidad
│   ├── export/      Generación de .docx: ZIP, OOXML y rasterizado
│   ├── images/      Carga y ordenación de los archivos del usuario
│   └── layout/      Motor de acomodo (puro, sin DOM) y unidades
├── pages/           Rutas del sitio
└── styles/          Tokens de diseño y estilos globales
tests/               Pruebas con Vitest
```

### Decisiones de diseño

- **Astro con una sola isla.** La portada se sirve como HTML estático sin una línea de
  JavaScript; React se descarga únicamente al entrar en `/herramienta`. Eso mantiene el sitio
  rápido en conexiones lentas y ayuda al posicionamiento.
- **El motor de acomodo no toca el DOM.** Vive en `src/lib/layout/engine.ts` como funciones
  puras que reciben medidas y devuelven posiciones en milímetros, así que se puede probar
  automáticamente y reutilizar en cualquier parte.
- **Generación de `.docx` sin dependencias.** Un `.docx` es un ZIP con XML dentro; el proyecto
  incluye un escritor de ZIP mínimo (`src/lib/export/zip.ts`) y los fragmentos de OOXML
  (`src/lib/export/ooxml.ts`), en vez de arrastrar una librería pesada al navegador.
- **Rasterizado antes de exportar.** Cada imagen se dibuja al tamaño exacto que ocupará, con su
  rotación y recorte ya aplicados, para que el documento de Word se vea idéntico a la vista previa.

## Sistema de diseño

La identidad sale del mundo del propio producto: la preimpresión. Papel como fondo, tinta negra
para el texto, **magenta de proceso** como único acento y **cian** reservado a la capa técnica
(guías de margen, cotas y marcas de corte). Las medidas y etiquetas van en monoespaciada, como
las anotaciones de un pliego de imprenta.

- **Color:** `--paper` `#fcfcfa` · `--ink` `#15171b` · `--magenta` `#d6006c` · `--cyan` `#0091c7`.
  Todos los tokens están en `src/styles/global.css`; ningún componente inventa colores.
- **Tipografía:** Archivo variable en dos anchos — `font-stretch: 112%` para los títulos (una
  grotesca ensanchada, no la serif de alto contraste habitual) y ancho normal para el texto —
  más IBM Plex Mono para cotas, etiquetas y botones. Ambas se sirven desde el propio dominio:
  no hay peticiones a Google Fonts.
- **Elemento de firma:** el pliego animado de la portada. Las posiciones de cada marco se
  calculan en tiempo de compilación con el mismo motor que usa la herramienta, así que lo que
  se ve es un resultado real del programa, no una ilustración. Al navegador solo le llegan las
  coordenadas y unas 30 líneas de JavaScript.
- **Estructura como información:** los pasos van numerados porque son una secuencia real; las
  prestaciones se presentan como ficha técnica y el problema como comparación a dos columnas,
  en lugar de repetir tarjetas en toda la página.

## La herramienta, en dos pasos

`/herramienta` separa el trabajo en dos pantallas para no saturar la vista:

1. **Elegir imágenes.** Solo la zona de carga y la galería de miniaturas, a tamaño cómodo para
   revisar, reordenar arrastrando, girar y descartar.
2. **Acomodar e imprimir.** Panel de ajustes a la izquierda y el pliego a la derecha. Desde aquí
   se puede volver al paso anterior o agregar más imágenes sin perder los ajustes.

### Límite de imágenes y memoria

El tope es de **200 imágenes por documento**, con un aviso a partir de 100 (`src/lib/config/limits.ts`).

No hay servidor: el techo real lo pone la memoria del equipo de quien usa la herramienta. Una foto
de celular de 12 megapíxeles ocupa unos 48 MB ya decodificada, así que lo que pesa no es el número
de archivos sino cuántos tiene el navegador abiertos a la vez. Por eso, además del tope:

- Las imágenes de la vista previa y de las miniaturas usan `loading="lazy"` y `decoding="async"`,
  de modo que el navegador solo decodifica lo que está en pantalla.
- Cada hoja de la vista previa usa `content-visibility: auto`, así que las páginas fuera de la
  ventana ni siquiera se dibujan.
- Los `objectURL` se liberan al quitar imágenes o al vaciar la selección.

Los archivos originales nunca se recomprimen: se conservan intactos y se usan tal cual al exportar.

## Cómo funciona el acomodo

El motor no usa una cuadrícula fija. Prueba **todas las formas de repartir las imágenes en filas**
respetando el orden elegido, calcula la altura que tendría cada fila al ocupar el ancho útil
completo y se queda con la combinación que cubre más superficie. Un factor de equilibrio penaliza
los repartos donde unas imágenes quedan enormes y otras diminutas.

Para conjuntos de más de 20 imágenes por hoja (o cuando se recorta para rellenar) se usa una
cuadrícula uniforme, que se evalúa igualmente en todas sus combinaciones de filas y columnas.

## Despliegue en Vercel

1. Sube el proyecto a un repositorio de GitHub:

   ```bash
   git init
   git add .
   git commit -m "Primera versión"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/imagenes-por-hoja.git
   git push -u origin main
   ```

2. En [vercel.com](https://vercel.com) elige **Add New → Project** e importa el repositorio.
   Vercel detecta Astro automáticamente:
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Output directory: `dist`

3. Pulsa **Deploy**. Cada `git push` a `main` publica una nueva versión.

4. Cuando conectes tu dominio, actualiza la URL en **dos** archivos:
   - `astro.config.mjs` → `SITE_URL`
   - `src/lib/config/site.ts` → `SITE.url`
   - y la línea `Sitemap:` de `public/robots.txt`.

## Publicidad

El sitio hoy no muestra anuncios ni carga scripts de terceros. La maquetación ya reserva los
lugares mediante el componente `AdSlot`, que no renderiza nada mientras `ADS.enabled` sea `false`
en `src/lib/config/site.ts`.

Para activar Google AdSense más adelante:

1. Solicita la aprobación de AdSense (exige las páginas de privacidad y términos, ya publicadas
   en `/privacidad` y `/terminos`).
2. En `src/lib/config/site.ts` pon `enabled: true`, tu identificador `ca-pub-…` y los ids de los
   bloques.
3. Sube a `public/ads.txt` el archivo que te indique AdSense.

Los huecos tienen altura mínima reservada para que el contenido no salte al cargar el anuncio,
que es lo que suele castigar Google en las métricas de experiencia de página.

## Licencia

Uso privado del proyecto. Ajusta esta sección si decides publicarlo con una licencia abierta.

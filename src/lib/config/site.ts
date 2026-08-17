/**
 * Configuracion global del sitio.
 * Un solo lugar para editar dominio, textos de marca y activacion de anuncios.
 */

export const SITE = {
  name: 'Imágenes por Hoja',
  shortName: 'ImagenesPorHoja',
  url: 'https://imagenesporhoja.vercel.app/',
  locale: 'es',
  description:
    'Acomoda automáticamente varias imágenes en una hoja para imprimir. Eliges cuántas van por página y la herramienta calcula el tamaño y la posición que mejor aprovechan el espacio, respetando los márgenes. Gratis y sin subir archivos.',
  author: 'Imágenes por Hoja',
} as const;

export const NAV_LINKS = [
  { href: '/#que-resuelve', label: 'Qué resuelve' },
  { href: '/#como-funciona', label: 'Cómo funciona' },
  { href: '/#caracteristicas', label: 'Ficha técnica' },
  { href: '/#preguntas', label: 'Preguntas' },
] as const;

/**
 * Anuncios: desactivados.
 *
 * La maquetación ya reserva los contenedores (ver src/components/layout/AdSlot.astro),
 * pero no se renderiza nada mientras `enabled` sea false, así que el sitio
 * queda 100 % limpio y sin scripts de terceros.
 *
 * Para activar Google AdSense más adelante:
 *   1. Consigue la aprobación de AdSense (requiere las páginas de privacidad
 *      y términos, que ya están publicadas en /privacidad y /terminos).
 *   2. Pon `enabled: true`, tu `client` (ca-pub-XXXXXXXX) y los ids de bloque.
 *   3. Sube el archivo `public/ads.txt` que te indique AdSense.
 * No hace falta tocar el diseño: los huecos ya están previstos.
 */
export const ADS = {
  enabled: false,
  provider: 'adsense' as 'adsense' | 'propio',
  client: '',
  slots: {
    landingInline: '',
    toolFooter: '',
  },
} as const;

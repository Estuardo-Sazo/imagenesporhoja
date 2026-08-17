// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

/**
 * Dominio de produccion. Cambialo aqui y en src/lib/config/site.ts
 * cuando conectes tu dominio definitivo en Vercel.
 */
const SITE_URL = 'https://imagenesporhoja.com';

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'ignore',
  integrations: [
    react(),
    sitemap({
      // Las etiquetas canónicas se escriben sin barra final; el sitemap debe
      // coincidir para que Google no vea dos direcciones distintas.
      serialize: (item) => ({ ...item, url: item.url.replace(/(.)\/$/, '$1') }),
    }),
  ],
  build: { inlineStylesheets: 'auto' },
});

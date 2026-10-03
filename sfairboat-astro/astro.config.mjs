// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdir, readFile, writeFile } from 'node:fs/promises';

// Copies the site's stylesheet to /admin/site.css (plus the business details
// to /admin/placeholders.json) so the site editor's live preview
// (public/admin/preview.js) looks like the real pages.
const adminPreviewCss = {
  name: 'admin-preview-css',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      const assets = new URL('_astro/', dir);
      const files = (await readdir(assets)).filter((f) => f.endsWith('.css')).sort();
      const css = await Promise.all(files.map((f) => readFile(new URL(f, assets), 'utf8')));
      await writeFile(new URL('admin/site.css', dir), css.join('\n'));
      // Business details so the preview can fill in {phone}, {businessName}, etc.
      const b = JSON.parse(await readFile(new URL('./src/content/business.json', import.meta.url), 'utf8'));
      const a = b.address ?? {};
      await writeFile(
        new URL('admin/placeholders.json', dir),
        JSON.stringify({
          businessName: b.name,
          phone: b.phone,
          ownerName: b.owner?.name,
          years: String(b.foundedYears ?? ''),
          hours: b.hours,
          address: `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`,
        })
      );
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: 'https://www.sfairboatadventures.com',
  integrations: [sitemap(), adminPreviewCss],
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    inlineStylesheets: 'auto',
  },
});

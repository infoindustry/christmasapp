import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

// every *.html in the project root is a page (portrait.html is a dev-only tool and is left out).
// base './' + relative asset paths: the site works from any sub-path, e.g. https://<user>.github.io/<repo>/
const pages = Object.fromEntries(readdirSync('.').filter(f => f.endsWith('.html') && f !== 'portrait.html').map(f => [f.replace('.html', ''), resolve(f)]));
export default defineConfig({ base: './', server: { host: true }, build: { rollupOptions: { input: pages } } });

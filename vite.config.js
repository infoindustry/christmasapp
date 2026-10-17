import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

// every *.html in the project root is a page (the app + the earlier experiments)
const pages = Object.fromEntries(readdirSync('.').filter(f => f.endsWith('.html')).map(f => [f.replace('.html', ''), resolve(f)]));
export default defineConfig({ server: { host: true }, build: { rollupOptions: { input: pages } } });

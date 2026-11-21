import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves the project site under /plainly/, so built asset
  // paths must be relative to that subpath.
  base: '/plainly/',
})

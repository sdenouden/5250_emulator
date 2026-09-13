import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // Build for CommonJS and ES modules
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,            // Clean the dist folder before building
  minify: true
});

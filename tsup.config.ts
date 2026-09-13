import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'], // Build for CommonJS and ES modules
  dts: true,              // Generate declaration file (.d.ts)
  splitting: false,
  sourcemap: true,
  clean: true,            // Clean the dist folder before building
  minify: true
});

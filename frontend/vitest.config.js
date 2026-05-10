import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    reporters: ['verbose', 'junit'],
    outputFile: { junit: 'reports/junit-frontend.xml' },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'xml'],
      reportsDirectory: 'reports/coverage-frontend',
      exclude: ['src/test/**', 'src/main.jsx', 'vite.config.js'],
    },
  },
});

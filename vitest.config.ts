import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      include: ['app/sales-engine/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': '/workspace',
    },
  },
});

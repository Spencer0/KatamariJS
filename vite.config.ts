import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/KatamariJS/',
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
  },
});

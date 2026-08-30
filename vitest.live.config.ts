import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/live/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 60000,
    hookTimeout: 60000,
    fileParallelism: false,
    retry: 1,
  },
});

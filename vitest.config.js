import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: './test/globalSetup.js',
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
})

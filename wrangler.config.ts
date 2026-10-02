import { defineWranglerConfig } from 'wrangler/experimental-config'

export default defineWranglerConfig((ctx) => {
  if (ctx.isPreview) {
    return {
      build: {
        command: 'node ./bin/flaregun.js build',
        cwd: '.',
        watchDir: ['functions', 'public'],
      },
      assetsDirectory: './public/',
    }
  }
  return {
    build: {
      command: 'node ./bin/flaregun.js build',
      cwd: '.',
      watchDir: ['functions', 'public'],
    },
    assetsDirectory: './public/',
  }
})

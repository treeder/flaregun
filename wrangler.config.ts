import { defineWranglerConfig } from 'wrangler/experimental-config'

export default defineWranglerConfig(() => {
  return {
    build: {
      command: 'node ./bin/flaregun.js build',
      cwd: '.',
      watchDir: ['functions', 'public'],
    },
    assetsDirectory: './public/',
  }
})

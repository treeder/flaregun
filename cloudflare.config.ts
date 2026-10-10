import { bindings, defineConfig } from 'cf/config'

export default defineConfig((ctx) => {
  if (ctx.isPreview) {
    return {
      worker: {
        name: 'flaregun',
        compatibilityDate: '2026-09-22',
        entrypoint: './dist/index.js',
        previewUrls: true,
        placement: {
          mode: 'smart',
        },
        observability: {
          enabled: true,
          headSamplingRate: 1,
          issues: {
            enabled: true,
          },
        },
        env: {
          ENV: bindings.text('preview'),
          D1: bindings.d1({
            name: 'flaregun-dev',
            id: '603a5bdc-a4b5-4b49-95b3-7e6817dc4bfc',
          }),
          KV: bindings.kv({
            id: '0a5bdf2a494a4d8cb0d1d5d8e26827f7',
          }),
          R2: bindings.r2({
            name: 'flaregun-dev',
          }),
          QUEUE: bindings.queue({
            name: 'flaregun-dev',
          }),
          ASSETS: bindings.assets(),
        },
      },
    }
  }
  return {
    worker: {
      name: 'flaregun',
      compatibilityDate: '2026-09-22',
      entrypoint: './dist/index.js',
      previewUrls: true,
      placement: {
        mode: 'smart',
      },
      observability: {
        enabled: true,
        headSamplingRate: 1,
        issues: {
          enabled: true,
        },
      },
      env: {
        ENV: bindings.text('prod'),
        D1: bindings.d1({
          name: 'flaregun-prod',
          id: '77fddcbc-fc0f-4bb0-8190-58b87de4af4b',
        }),
        KV: bindings.kv({
          id: '98db8d8b30984b0fba3ce8d4fd6ec292',
        }),
        R2: bindings.r2({
          name: 'flaregun-prod',
        }),
        ASSETS: bindings.assets(),
      },
    },
  }
})

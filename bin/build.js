import fs from 'node:fs/promises'
import path from 'path'
import { exec } from 'child_process'
import * as esbuild from 'esbuild'

export async function build(args) {
  console.log('building...')

  let proc = exec('npx wrangler pages functions build --outdir=./dist/')

  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP']
  for (const signal of signals) {
    process.on(signal, () => {
      console.log(`Received ${signal}. Killing child process...`)
      proc.kill()
      process.exit(0)
    })
  }

  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  proc.on('error', (err) => {
    console.log(`child process error: ${err}`)
  })
  let promise = new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      console.log(`child process exited with code ${code}`)
      resolve()
    })
  })
  await promise
  console.log('done building')
  await postBuild()
  console.log('done postBuild')
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch (e) {
    return false
  }
}

async function postBuild() {
  // check if scheduled or queue functions available
  let add = ''
  let prepends = ''

  try {
    const filePath = path.resolve(process.cwd(), './functions/queue.js')
    if (await fileExists(filePath)) {
      const res = await esbuild.build({
        entryPoints: [filePath],
        bundle: true,
        format: 'iife',
        globalName: '__queue_module__',
        write: false,
        target: 'es2022',
      })
      prepends += res.outputFiles[0].text + '\n'

      add += `
      async queue(batch, env, ctx) {
        ctx.data = {}
        ctx.env = env
        ctx.batch = batch
        return await __queue_module__.queue(ctx)
      },
    `
    }
  } catch (e) {
    console.error(e)
  }

  try {
    const filePath = path.resolve(process.cwd(), './functions/scheduled.js')
    if (await fileExists(filePath)) {
      const res = await esbuild.build({
        entryPoints: [filePath],
        bundle: true,
        format: 'iife',
        globalName: '__scheduled_module__',
        write: false,
        target: 'es2022',
      })
      prepends += res.outputFiles[0].text + '\n'

      add += `
      async scheduled(controller, env, ctx) {
        ctx.data = {}
        ctx.env = env
        ctx.controller = controller
        return await __scheduled_module__.scheduled(ctx)
      },
    `
    }
  } catch (e) {
    console.error(e)
  }

  if (!add) {
    // nothing to modify
    return
  }
  const filePath = path.resolve(process.cwd(), './dist/index.js')

  let data = await fs.readFile(filePath, 'utf8')

  const searchString = 'var pages_template_worker_default'
  const lines = data.split('\n')
  let modifiedData = prepends

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      // Add your extra lines here
      modifiedData += lines[i] + '\n'
      modifiedData += add
    } else {
      modifiedData += lines[i] + '\n'
    }
  }

  await fs.writeFile(filePath, modifiedData, 'utf8')
  console.log('File modified successfully!')
}

import fs from 'node:fs/promises'
import path from 'path'
import { exec } from 'child_process'

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
  try {
    const filePath = path.resolve(process.cwd(), './functions/queue.js')
    if (await fileExists(filePath)) {
      let s = await transformFileContents(filePath, 'queue')

      add += `
      async queue(batch, env, ctx) {
        ${s}
        ctx.data = {}
        ctx.env = env
        ctx.batch = batch
        return await queue2(ctx)
      },
    `
    }
  } catch (e) {
    console.error(e)
  }

  try {
    const filePath = path.resolve(process.cwd(), './functions/scheduled.js')
    if (await fileExists(filePath)) {
      let s = await transformFileContents(filePath, 'scheduled')

      add += `
      async scheduled(controller, env, ctx) {
        ${s}
        ctx.data = {}
        ctx.env = env
        ctx.controller = controller
        return await scheduled2(ctx)
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
  let modifiedData = ''

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

async function transformFileContents(filePath, functionName) {
  // const module = await import(filePath)
  // console.log(module)

  let contents = (await fs.readFile(filePath)).toString()
  let lines = contents.split('\n')

  let qs = ''
  let rename = `${functionName}(`
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    if (line.startsWith('//')) continue
    if (line.startsWith('import')) continue
    if (line.includes(rename)) {
      qs += line.replace(rename, `${functionName}2(`).replace('export', '') + '\n'
    } else {
      qs += line + '\n'
    }
  }
  return qs
}

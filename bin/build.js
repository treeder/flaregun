import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'

export async function build(args) {
  console.log('building...')

  let proc = exec('npx wrangler pages functions build --outdir=./dist/')
  proc.stdout.pipe(process.stdout)
  proc.stderr.pipe(process.stderr)
  proc.on('close', (code) => {
    console.log(`child process exited with code ${code}`)
  })
  proc.on('error', (err) => {
    console.log(`child process error: ${err}`)
  })
  let promise = new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      console.log(`XXX child process exited with code ${code}`)
      resolve()
    })
  })
  await promise
  console.log('done building')
  await postBuild()
  console.log('done postBuild')
}

async function postBuild() {
  // check if scheduled or queue functions available
  let add = ''
  try {
    const filePath = path.resolve(process.cwd(), './functions/queue.js')
    const module = await import(filePath) // Dynamically import the module
    console.log(module)

    // Just want to read the contents actually
    let queueContents = fs.readFileSync(filePath).toString()
    let lines = queueContents.split('\n')

    let qs = ''
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      if (line.includes('queue(')) {
        qs += line.replace('queue(', 'queue2(').replace('export', '') + '\n'
      } else {
        qs += line + '\n'
      }
    }

    add += `
    async queue(batch, env, ctx) {
       ${qs}
      ctx.env = env
      ctx.batch = batch
      return await queue2(ctx)
    },
    `
  } catch (e) {
    console.error(e)
  }

  const filePath = path.resolve(process.cwd(), './dist/index.js')

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err)
      return
    }

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

    fs.writeFile(filePath, modifiedData, 'utf8', (err) => {
      if (err) {
        console.error(err)
        return
      }
      console.log('File modified successfully!')
    })
  })
}

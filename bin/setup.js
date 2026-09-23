import 'dotenv/config'
import { parseFile } from 'jsonc-parse'
import { fetchCF } from './cfapi.js'
import { writeFileSync, existsSync } from 'fs'

export async function setup(args) {
  let envFilter
  if (args) {
    let idx = args.indexOf('--env')
    if (idx !== -1 && idx + 1 < args.length) {
      envFilter = args[idx + 1]
    }
  }
  console.log('ENV:', process.env)
  let c = {
    env: process.env,
    envFilter,
  }

  if (!c.env.CLOUDFLARE_ACCOUNT_ID || !c.env.CLOUDFLARE_API_TOKEN) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in the environment')
  }
  await parseWrangler(c)
}

async function parseWrangler(c) {
  const configFile = existsSync('./wrangler.jsonc')
    ? './wrangler.jsonc'
    : existsSync('./wrangler.json')
      ? './wrangler.json'
      : './wrangler.jsonc'
  const wranglerConfig = await parseFile(configFile)
  // console.log(wranglerConfig)

  // Top-level production resources
  if (
    wranglerConfig.kv_namespaces ||
    wranglerConfig.d1_databases ||
    wranglerConfig.r2_buckets ||
    wranglerConfig.queues
  ) {
    await processResources(c, wranglerConfig, wranglerConfig.name, 'production')
  }

  // Previews resources
  if (wranglerConfig.previews) {
    const previewWorkerName =
      wranglerConfig.previews.name || (wranglerConfig.name ? `${wranglerConfig.name}-preview` : 'preview')
    await processResources(c, wranglerConfig.previews, previewWorkerName, 'previews')
  }

  // Backwards compatibility for legacy environments
  if (wranglerConfig.env) {
    for (let env in wranglerConfig.env) {
      if (c.envFilter && env !== c.envFilter) {
        continue
      }
      let prod = wranglerConfig.env[env]
      let workerName = prod.name || wranglerConfig.name
      await processResources(c, prod, workerName, `environment: ${env}`)
    }
  }

  writeFileSync(configFile, JSON.stringify(wranglerConfig, null, 2))

  console.log('Setup complete!')
}

async function processResources(c, target, workerName, label) {
  if (!target) return
  console.log(`Creating resources for ${label}`)
  if (target.kv_namespaces) {
    for (let kv of target.kv_namespaces) {
      console.log(kv)
      await createKV(c, kv, workerName)
    }
  }
  if (target.d1_databases) {
    for (let d1 of target.d1_databases) {
      console.log(d1)
      await createDB(c, d1, workerName)
    }
  }
  if (target.r2_buckets) {
    for (let r2 of target.r2_buckets) {
      console.log(r2)
      await createR2(c, r2, workerName)
    }
  }
  if (target.queues?.producers) {
    for (let q of target.queues.producers) {
      console.log(q)
      await createQueue(c, q, workerName)
    }
  }
}

async function createDB(c, d1, workerName) {
  // if (d1.database_id) {
  //   return
  // }
  const dbName = d1.database_name || workerName
  d1.database_name = dbName
  // check if exists first
  let r = await fetchCF(c, '/d1/database', {
    q: { name: dbName },
  })
  console.log(r)
  if (r.result.length > 0) {
    console.log(`Database ${dbName} already exists with id ${r.result[0].uuid}`)
    d1.database_id = r.result[0].uuid
    return
  }
  console.log(`Creating database ${dbName}`)
  r = await fetchCF(c, '/d1/database', {
    method: 'POST',
    body: {
      name: dbName,
      // primary_location_hint: "wnam"
    },
  })
  console.log(r)
  d1.database_id = r.result.uuid
}

async function createKV(c, kv, workerName) {
  const bindingName = kv.binding || 'kv'
  const normalisedBinding = bindingName.toLowerCase().replaceAll('_', '-')
  const autoName = workerName ? `${workerName}-${normalisedBinding}` : normalisedBinding
  const title = kv.title || autoName
  // if (kv.id) {
  //   return
  // }
  // check if exists first
  let r = await fetchCF(c, '/storage/kv/namespaces', {
    q: { title },
  })
  console.log(r)
  for (let kstore of r.result) {
    if (
      kstore.title === title ||
      (workerName && (kstore.title === `${workerName}-${bindingName}` || kstore.title === workerName))
    ) {
      console.log(`KV store with title ${kstore.title} already exists with id ${kstore.id}`)
      kv.id = kstore.id
      return
    }
  }
  console.log(`Creating KV store ${title}`)
  r = await fetchCF(c, '/storage/kv/namespaces', {
    method: 'POST',
    body: {
      title,
      // primary_location_hint: "wnam"
    },
  })
  console.log(r)
  kv.id = r.result.id
}

async function createR2(c, r2, workerName) {
  const bucketName = r2.bucket_name || workerName
  r2.bucket_name = bucketName
  try {
    let r = await fetchCF(c, `/r2/buckets/${bucketName}`, {})
    console.log(r)
    console.log(`R2 bucket ${bucketName} already exists`)
    return
  } catch (e) {
    console.error(e, e.data)
    if (e.data.errors.length > 0) {
      let e2 = e.data.errors[0]
      if (e2.code === 10006) {
        // bucket does not exist
      } else {
        throw e
      }
    }
  }
  console.log(`Creating R2 bucket ${bucketName}`)
  let r = await fetchCF(c, '/r2/buckets', {
    method: 'POST',
    body: {
      name: bucketName,
      // primary_location_hint: "wnam"
    },
  })
  console.log(r)
}

async function createQueue(c, r2, workerName) {
  const queueName = r2.queue || workerName
  r2.queue = queueName
  console.log(`Creating queue ${queueName}`)
  try {
    let r = await fetchCF(c, '/queues', {
      method: 'POST',
      body: {
        queue_name: queueName,
        // primary_location_hint: "wnam"
      },
    })
    console.log(r)
  } catch (e) {
    console.log(e.message)
    if (e.status != 409) {
      // 409 means it already exists, all good
      throw e
    }
  }
}

import { BaselimeLogger } from './baselime-logger.js'
import { nanoid } from 'nanoid'

let env = process.env

let logger = new BaselimeLogger({
    apiKey: env.BASELIME_API_KEY,
    service: `flaregun`,
    // ctx: ctx,
    requestId: nanoid(),
    namespace: 'baselime-logger-test.js',
})

let start = Date.now()
logger.log('start of rquest')
logger.log('this one has an error:', 'abc', 123, { name: "johnny" }, new Error('This is an error'))
logger.log('1 something happened down there:', new Error('2 this is an error with cause', { cause: new Error('3 this is cause of error') }))
logger.logd('This one has some data attached', 'abc', { name: 'johnny', price: 123.45, count: 3, date: new Date() })
logger.logd('This one has some data attached AND is an error', 'abc', new Error("something bad happened"), { name: 'johnny', price: 123.45, count: 3, date: new Date() })
const duration = Date.now() - start
logger.logd("end of request", { duration })
let r = await logger.flush()
console.log("RESPONSE:", r.status)

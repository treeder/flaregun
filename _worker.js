import { globals, initGlobals } from "./app/globals.js"
import { BaselimeLogger } from "./baselime-logger.js"
import { nanoid } from "nanoid"
import { FlareApp } from './app.js'

let routes = new Hono()
routes.get('/', async (c) => {
    return c.text('Hello World!')
})

let flareApp = new FlareApp({
    once: initGlobals,
})

export default {
    async fetch(req, env, ctx) {

    },
}

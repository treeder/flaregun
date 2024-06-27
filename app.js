import { nanoid } from "nanoid"

class FlaregunApp {

    constructor(opts) {
        this.opts = opts
        this.onceCount = 0
    }

    async fetch(req, env, ctx) {
        // console.log("fetch:", request.url)
        // console.log("ENV:", env)
        req.logger = new BaselimeLogger({
            service: `${this.opts.name || 'flaregun'}-${env.ENV || 'dev'}`,
            apiKey: env.BASELIME_API_KEY,
            ctx: ctx,
            isLocal: env.IS_LOCAL,
            requestId: nanoid(10),
            namespace: req.url,
        })

        const url = new URL(req.url)
        if (this.opts.private && this.opts.private.startsWith(url.pathname)) {
            return new Response("not found", { status: 404 })
        }
        if (this.opts.static && this.opts.static.startsWith(url.pathname)) {
            return env.ASSETS.fetch(req)
        }

        if (this.opts?.init) {
            await once(this.opts.init, req, env, ctx)
        }

        let res
        try {
            return this.opts.routes
        } catch (e) {
            req.logger.log(e)
            res = new Response("Internal server error", { status: 500 })
        }
        ctx.waitUntil(req.logger.flush())
        return res
    }

    async once(onceFunc, req, env, ctx) {
        if (this.onceCount > 0) return
        req.logger.log("ONCE", this.onceCount)
        this.onceCount++
        try {
            await onceFunc(req, env, ctx)
        } catch (e) {
            req.logger.log(e)
        }
    }
}
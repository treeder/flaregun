class FlareApp {
    constructor(opts) {
        this.opts = opts
        this.onceCount = 0
    }

    async fetch(req, env, ctx) {
        // console.log("fetch:", request.url)
        // console.log("ENV:", env)
        req.logger = new BaselimeLogger({
            service: `myapp-${env.ENV}`,
            apiKey: env.BASELIME_API_KEY,
            ctx: ctx,
            isLocalDev: env.IS_LOCAL,
            requestId: nanoid(10),
            namespace: req.url,
        })

        const url = new URL(req.url)
        if (
            url.pathname.startsWith("/views/") ||
            url.pathname.startsWith("/server/")
        ) {
            return new Response("not found", { status: 404 })
        }
        if (url.pathname.startsWith("/assets/") || url.pathname.endsWith(".map")) {
            return env.ASSETS.fetch(req)
        }

        if (this.opts?.once) {
            await once(this.opts.once, req, env, ctx)
        }

        let x = {
            // 'bad query, yo': 'abc',
            'goodField': 'abc',
        }
        await globals.d1.insert('test', x)

        let res
        try {
            if (url.pathname.startsWith("/v1/")) {
                // res = await api.fetch(req, env, ctx)
            } else {
                // res = await app.fetch(req, env, ctx)
            }
            return new Response("Hello world!")
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
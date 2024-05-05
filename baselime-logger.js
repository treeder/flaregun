export class BaselimeLogger {

    constructor(options = {}) {
        this.options = options
        this.promises = []
    }

    async blFetch(data = {}) {
        data.requestId = this.options.requestId
        data.namespace = this.options.namespace
        return await fetch('https://events.baselime.io/v1/logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.options.apiKey,
                'x-service': this.options.service,
            },
            body: JSON.stringify(data),
        })
    }

    async write(msgObject) {
        // console.log(msgObject)
        //  { message: "Hello from the serverless world!", data: { userId: 'random-id' } })
        let l
        if (msgObject instanceof String) {
            msgObject = { message: msgObject }
        }
        if (msgObject instanceof Error) {
            msgObject = { error: msgObject }
        }
        if (msgObject.error) {
            l = "error"
            if (msgObject.error instanceof Error) {
                let e = msgObject.error
                // let m = msgObject.message ? msgObject.message + ": " : ""
                let em
                if (e.cause) {
                    // console.log("Cause found", error.cause.stack)
                    em = (e.cause.stack ? `${e.cause.stack}` : e.cause.message)
                } else if (e.stack) {
                    em = (e.stack ? `${e.stack}` : "")
                } else {
                    em = e.message
                }
                msgObject.error = em
            } else {
                msgObject.message += " " + msgObject.error
            }
        }
        l = msgObject.level || msgObject.severity || l || 'info'
        let data = msgObject.data || {}
        data.level ||= l
        this.promises.push(this.blFetch(msgObject))
    }

    // try to act like console.log
    log(message, ...optionalParams) {
        return this._logd2(message, optionalParams)
    }

    // like log, but last item can be a data map which will be sent as the "data" field in the log
    logd(message, ...optionalParams) {
        let data = null
        if (optionalParams.length > 0 && typeof optionalParams[optionalParams.length - 1] == "object") {
            data = optionalParams.pop()
        }
        return this._logd2(message, optionalParams, data)
    }

    _logd2(message, optionalParams, data) {
        // console.log("LOG:", message, optionalParams)
        console.log(message, ...optionalParams)
        let err = null
        for (let p of optionalParams) {
            if (p instanceof Error) {
                err = p
            }
        }
        if (message instanceof Error) {
            err = message
            message = err.message
        }
        message = message + " " + optionalParams.map(p => {
            console.log("p", p, typeof p)
            if (p instanceof Error) {
                return p.message
            }
            if (p instanceof Object) {
                return JSON.stringify(p)
            }
            return p
        }).join(" ")
        return this.write({ message: message, error: err })
    }

    flush() {
        return Promise.allSettled(this.promises)
    }
}

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
        console.log(msgObject)
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
                let m = msgObject.message ? msgObject.message + ": " : ""
                if (e.cause) {
                    // console.log("Cause found", error.cause.stack)
                    msgObject.message = m + e.message + (e.cause.stack ? `: ${e.cause.stack}` : "")
                } else {
                    msgObject.message = m + e.message + (e.stack ? `: ${e.stack}` : "")
                }
                msgObject.error = msgObject.message
            } else {
                msgObject.message ||= msgObject.error
            }
        }
        l = msgObject.level || msgObject.severity || l || 'info'
        let data = msgObject.data || {}
        data.level ||= l
        this.promises.push(this.blFetch(msgObject))
    }

    // try to act like console.log
    log(message, ...optionalParams) {
        // console.log("LOG:", message, optionalParams)
        if (message instanceof Error) {
            return this.write({ error: message, data: optionalParams })
        }
        message = message + " " + optionalParams.map(p => JSON.stringify(p)).join(" ")
        return this.write({ message })
    }

    // like log, but last item can be a data map which will be sent as the "data" field in the log
    logd(message, ...optionalParams) {
        // console.log("LOG:", message, optionalParams)
        if (message instanceof Error) {
            return this.write({ error: message, data: optionalParams })
        }
        let data = null
        if (optionalParams.length > 0 && typeof optionalParams[optionalParams.length - 1] == "object") {
            data = optionalParams.pop()
        }
        message = message + " " + optionalParams.map(p => JSON.stringify(p)).join(" ")
        return this.write({ message, data })
    }

    flush() {
        return Promise.allSettled(this.promises)
    }
}

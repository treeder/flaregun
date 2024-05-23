import { D1 } from "../d1.js"

export const globals = {}

export function initGlobals(req, env, ctx) {
    globals.d1 = new D1(env.D1)

}
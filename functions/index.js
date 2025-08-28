import { User } from "./models/user.js"

export async function onRequestGet(c) {
  return Response.json({ hello: 'world!' })
}

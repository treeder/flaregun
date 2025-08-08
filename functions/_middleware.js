import { ClassMigrations } from "migrations"
import { User } from "./models/user.js"
import { D1 } from "../d1.js"

export async function onRequest(c) {
  c.data.d1 = new D1(c.env.D1)
  c.data.d1.debug = true
  await once(c)
  return await c.next()
}

let count = 0
async function once(c) {
  if (count > 0) return
  count++

  let migrations = new ClassMigrations(c.data.d1, [
    User,
  ])
  await migrations.run(c.data.d1)

}


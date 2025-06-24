import { nanoid } from "nanoid"

export class D1 {
  constructor(db) {
    this.db = db
  }

  prepare(s) {
    return this.db.prepare(s)
  }

  async get(table, id, q = {}) {
    let r = await this.db.prepare(`SELECT * FROM ${table} where id = ?`).bind(id).first()
    this.parseProperties(r, q.model)
    return r
  }

  async delete(table, id) {
    return await this.db.prepare(`DELETE FROM ${table} where id = ?`).bind(id).run()
  }

  async query(table, q) {
    let st = this.prepStmt(table, q)
    let r = await st.all()
    // console.log("QUERY:", r)
    if (q.model) {
      for (let r2 of r.results) {
        this.parseProperties(r2, q.model)
      }
    }
    return r.results
  }

  async first(table, q) {
    q.limit = 1
    let st = this.prepStmt(table, q)
    let r = await st.first()
    // console.log("FIRST:", r)
    this.parseProperties(r, q.model)
    return r
  }

  prepStmt(table, q = {}) {
    // console.log("stmt", q)
    let s = "SELECT * FROM " + table
    let w = []
    let binds = []
    if (q.where && q.where.length > 0) {
      let i = 0
      for (const q2 of q.where) {
        // console.log("Q2:", q2)
        if (q2[1].toLowerCase() == "IS NOT NULL".toLowerCase())
          if (typeof q2[2] == "undefined") continue
        if (i > 0) w.push(" AND")
        if (q2[1].toLowerCase() == "or") {
          let w1 = this.singleW(q2[0])
          let w2 = this.singleW(q2[2])
          w.push(`(${w1.w.join(" ")} OR ${w2.w.join(" ")})`)
          binds.push(...w1.binds, ...w2.binds)
        } else {
          let w1 = this.singleW(q2)
          w.push(w1.w.join(" "))
          binds.push(...w1.binds)
        }

        i++
      }
      s += " WHERE " + w.join(" ")
    }
    if (q.order) {
      s += " ORDER BY " + q.order[0] + " " + q.order[1]
    }
    if (q.limit) s += " LIMIT " + q.limit
    if (q.offset) s += " OFFSET " + q.offset
    // console.log("SQL:", s, binds)
    let st = this.db.prepare(s).bind(...binds)
    return st
  }

  singleW(q2) {
    let w = []
    let binds = []
    let q0 = q2[0]
    if (q2[0].includes(".") && !(q2[0].includes("$") || q2[0].includes("("))) {
      // then it's a path into a json object. We reject $ and ( so it's not already an explicity json function
      let split = q2[0].split(".")
      q0 = `json_extract(${split[0]}, '$.${split.slice(1).join(".")}')`
    }
    if (q2[1].toLowerCase() == "is null") {
      w.push(` ${q0} IS NULL`)
    } else if (q2[1].toLowerCase() == "in") {
      w.push(` ${q0} IN (${q2[2].map((_, i) => "?").join(",")})`)
      binds.push(...this.toValues(q2[2]))
    } else {
      w.push(` ${q0} ${q2[1]} ?`)
      binds.push(this.toValue(q2[2]))
    }
    return { w, binds }
  }

  async insert(table, fields, values) {
    let ob = null
    if (fields instanceof Object && !Array.isArray(fields)) {
      ob = fields
      values = []
      let f2 = []
      for (const f in fields) {
        f2.push(f)
        values.push(fields[f])
      }
      fields = f2
    }
    let id
    if (!fields.includes("id")) {
      id = nanoid()
      fields.push("id")
      values.push(id)
      ob.id = id
    } else {
      id = values[fields.indexOf("id")]
      if (!id) {
        id = nanoid()
        values[fields.indexOf("id")] = id
        ob.id = id
      }
    }
    let now = new Date().toISOString()
    if (!fields.includes("createdAt")) {
      fields.push("createdAt")
      values.push(now)
      ob.createdAt = now
    }
    if (!fields.includes("updatedAt")) {
      fields.push("updatedAt")
      values.push(now)
      ob.updatedAt = now
    }
    for (let f of fields) {
      if (!/^[a-zA-Z0-9]+$/.test(f)) {
        throw new Error("Field must be alphanumeric")
      }
    }
    let s = `INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields
      .map((f) => "?")
      .join(",")})`
    // console.log("SQL:", s, values)
    let st = this.db.prepare(s).bind(...this.toValues(values))
    let r = await st.run()
    // let o = {}
    // fields.forEach((f, i) => o[f] = values[i])
    return { id: id, response: r, object: ob }
  }

  async update(table, id, fields, values) {
    let ob = null
    if (fields instanceof Object && !Array.isArray(fields)) {
      ob = fields
      values = []
      let f2 = []
      for (const f in fields) {
        if (f == "id") continue
        if (f == "createdAt") continue // skip, already set on create
        if (f == "updatedAt") continue // skip, we'll set below
        f2.push(f)
        values.push(fields[f])
      }
      fields = f2
    }
    let now = new Date().toISOString()
    fields.push("updatedAt")
    values.push(now)
    ob.updatedAt = now
    let s = `UPDATE ${table} SET ${fields.map((f) => f + " = ?").join(",")} WHERE id = ?`
    values.push(id)
    // console.log("SQL:", s, values)
    let st = this.db.prepare(s).bind(...this.toValues(values))
    let r = await st.run()
    // let o = {}
    // fields.forEach((f, i) => o[f] = values[i])
    return { id: id, response: r, object: ob }
  }

  toValues(values) {
    return values.map(this.toValue)
  }

  toValue(v) {
    if (v == null) return null
    if (v instanceof Date) return v.toISOString()
    if (typeof v == "undefined") return null
    if (typeof v == "object") return JSON.stringify(v)
    if (typeof v == "boolean") return v ? 1 : 0
    return v
  }

  parseProperties(ob, clz) {
    if (!clz || !clz.properties) return
    for (const prop in clz.properties) {
      if (!ob[prop]) continue
      let p = clz.properties[prop]
      ob[prop] = this.parseProp(ob[prop], p)
    }
  }

  parseProp(val, p) {
    if (!val || !p || !p.cast) return val
    return p.cast(val)
  }
}

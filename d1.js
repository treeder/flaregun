import { nanoid } from "nanoid"

export class D1 {

  constructor(db) {
    this.db = db
    this.debug = false
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
    if (q.where) {
      if (Array.isArray(q.where)) {
        if (q.where && q.where.length > 0) {
          let i = 0
          for (const q2 of q.where) {
            // console.log("Q2:", q2)
            if (q2[1].toLowerCase() == 'IS NOT NULL'.toLowerCase())
              if (typeof q2[2] == 'undefined') continue
            if (i > 0) w.push(' AND')
            if (q2[1].toLowerCase() == 'or') {
              let w1 = this.singleW(q2[0])
              let w2 = this.singleW(q2[2])
              w.push(`(${w1.w.join(' ')} OR ${w2.w.join(' ')})`)
              binds.push(...w1.binds, ...w2.binds)
            } else {
              let w1 = this.singleW(q2)
              w.push(w1.w.join(' '))
              binds.push(...w1.binds)
            }
            i++
          }
        }
      } else if (typeof q.where === 'object') {
        // if where is an object, then just exact match
        let i = 0
        for (const q2 in q.where) {
          // console.log("Q2:", q2)
          if (i > 0) w.push(' AND')
          w.push(`${q2} = ?`)
          binds.push(q.where[q2])
          i++
        }
      } else {
        throw new Error("Unknown type for 'where', must be an array or object")
      }
      if (w.length > 0) s += " WHERE " + w.join(' ')
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
    if (q2[0].includes('.') && !(q2[0].includes('$') || q2[0].includes('('))) {
      // then it's a path into a json object. We reject $ and ( so it's not already an explicity json function
      let split = q2[0].split('.')
      q0 = `json_extract(${split[0]}, '$.${split.slice(1).join('.')}')`
    }
    if (q2[1].toLowerCase() == 'is null') {
      w.push(` ${q0} IS NULL`)
    } else if (q2[1].toLowerCase() == 'in') {
      w.push(` ${q0} IN (${q2[2].map((_, i) => '?').join(',')})`)
      binds.push(...this.toValues(q2[2]))
    } else {
      w.push(` ${q0} ${q2[1]} ?`)
      binds.push(this.toValue(q2[2]))
    }
    return { w, binds }
  }

  async insert(table, obj, opts = {}) {
    let ob = null
    let fields = []
    let values = []
    if (obj instanceof Object && !Array.isArray(obj)) {
      ob = obj
      values = []
      let f2 = []
      for (const f in obj) {
        f2.push(f)
        values.push(obj[f])
      }
      fields = f2
    } else {
      // deprecated
      fields = obj
      values = opts
      ob = {}
      opts = {}
    }
    let id
    if (!fields.includes('id')) {
      id = nanoid()
      fields.push('id')
      values.push(id)
      ob.id = id
    } else {
      id = values[fields.indexOf('id')]
      if (!id) {
        id = nanoid()
        values[fields.indexOf('id')] = id
        ob.id = id
      }
    }
    let now = new Date().toISOString()
    if (!fields.includes('createdAt')) {
      fields.push('createdAt')
      values.push(now)
      ob.createdAt = now
    }
    if (!fields.includes('updatedAt')) {
      fields.push('updatedAt')
      values.push(now)
      ob.updatedAt = now
    }
    for (let f of fields) {
      if (!/^[a-zA-Z0-9]+$/.test(f)) {
        throw new Error('Field must be alphanumeric')
      }
    }
    let s = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(f => '?').join(',')})`
    if (this.debug) console.log("SQL:", s, values)
    let st = this.db.prepare(s).bind(...this.toValues(values))
    let r = await st.run()
    // let o = {}
    // fields.forEach((f, i) => o[f] = values[i])
    return { id: id, response: r, object: ob }
  }

  async update(table, id, obj, opts = {}) {
    let ob = null
    let fields = []
    let values = []
    if (obj instanceof Object && !Array.isArray(obj)) {
      ob = obj
      values = []
      let f2 = []
      for (const f in obj) {
        if (f == 'id') continue
        if (f == 'createdAt') continue // skip, already set on create
        if (f == 'updatedAt') continue // skip, we'll set below
        f2.push(f)
        values.push(obj[f])
      }
      fields = f2
    } else {
      fields = obj
      values = opts
      ob = {}
      opts = {}
    }
    opts.isUpdate = true
    let now = new Date().toISOString()
    fields.push('updatedAt')
    values.push(now)
    ob.updatedAt = now
    // let s = `UPDATE ${table} SET ${fields.map(f => f + ' = ' + this.valueWrap(f, opts)).join(',')} WHERE id = ?`
    let s = `UPDATE ${table} SET ${this.toFields(fields, values, opts)} WHERE id = ?`
    let vs = this.toValues(values)
    vs.push(id)
    if (this.debug) console.log("SQL:", s, vs)
    let st = this.db.prepare(s).bind(...vs)
    let r = await st.run()
    // let o = {}
    // fields.forEach((f, i) => o[f] = values[i])
    return { id: id, response: r, object: ob }
  }


  toValues(values) {
    return values.map(v => {
      return this.toValue(v)
    })
  }

  toValue(v) {
    // console.log("type of v:", f, typeof v)
    if (v == null) return null
    if (v instanceof Date) return v.toISOString()
    if (typeof v == 'undefined') return null
    if (typeof v == 'boolean') return v ? 1 : 0
    if (typeof v == 'object') return JSON.stringify(v)
    return v
  }

  toFields(fields, values, opts) {
    // replacing: let s = `UPDATE ${table} SET ${fields.map(f => f + ' = ?').join(',')} WHERE id = ?`
    let r = ''
    for (let i = 0; i < fields.length; i++) {
      let f = fields[i]
      if (i > 0) r += ', '
      r += f + ' = ' + this.valueWrap(f, values[i], opts)
    }
    return r
  }

  isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  valueWrap(f, v, opts) {
    if (opts.isUpdate && this.isObject(v)) {
      // then we'll do JSON patch here
      // stringifying so we don't need to have to bind values
      return `IFNULL('${JSON.stringify(v)}', json_patch(${f}, ?))`
    }
    return '?'
  }

  // isJSONType(f, opts){
  //   let clz = opts.model
  //   if (!clz || !clz.properties) return false
  //   let prop = clz.properties[f]
  //   console.log("PROP:", prop)
  //   if(!prop) return false
  //   if(prop.type == JSON){
  //     return true
  //   }
  //   return false
  // }

  parseProperties(ob, clz) {
    if (!ob) return
    if (!clz || !clz.properties) return
    for (const prop in clz.properties) {
      // console.log("prop:", prop, ob[prop])
      if (!ob[prop]) continue
      let p = clz.properties[prop]
      ob[prop] = this.parseProp(ob[prop], p)
    }
  }

  parseProp(val, p) {
    if (!val || !p) return val
    switch (p.type) {
      case Number:
        // return "NUMERIC"
        // todo: parse as number or let user pass in a parser if they want ot use Big.js or something
        return new Number(val)
      case Boolean:
        return val == 1
      case Date:
        return new Date(val)
      case BigInt:
        return new BigInt(val)
      case Object:
        return JSON.parse(val)
      case JSON:
        return JSON.parse(val)
      case Array:
        return JSON.parse(val)
      default:
        return val
    }

  }
}

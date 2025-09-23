import { parseModel } from 'models'
import { nanoid } from 'nanoid'

// This prevents TypeError: Do not know how to serialize a BigInt
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
BigInt.prototype.toJSON = function () {
  this.toString()
}

export class D1 {
  /**
   * Pass in a sqlite or D1 instance,
   *
   * ```js
   * let d1 = new D1(env.D1)
   * ```
   *
   * @param {*} db
   */
  constructor(db) {
    this.db = db
    this.debug = false
  }

  prepare(s) {
    return this.db.prepare(s)
  }

  /**
   * Get the table name for a class or string.
   * @param {String|class} clzOrName
   * @returns
   */
  tableName(clzOrName) {
    if (typeof clzOrName == 'string') {
      return clzOrName
    }
    return clzOrName.table || toTableName(clzOrName.name)
  }

  /**
   * Get a single record by id.
   * @param {*} table
   * @param {*} id
   * @param {*} q
   * @returns
   */
  async get(table, id, q = {}) {
    if (typeof table != 'string') {
      q.model = table
    }
    let r = await this.db
      .prepare(`SELECT * FROM ${this.tableName(table)} where id = ?`)
      .bind(id)
      .first()
    parseModel(r, q.model, { parseJSON: true })
    return r
  }

  /**
   * Delete a single record by id.
   * @param {*} table
   * @param {*} id
   * @returns
   */
  async delete(table, id) {
    return await this.db
      .prepare(`DELETE FROM ${this.tableName(table)} where id = ?`)
      .bind(id)
      .run()
  }

  /**
   * Query for data. See README for example.
   *
   * @param {*} table
   * @param {*} q
   * @returns
   */
  async query(table, q = {}) {
    if (typeof table != 'string') {
      q.model = table
    }
    let st = this.prepStmt(table, q)
    let r = await st.all()
    // console.log("QUERY:", r)
    if (q.model) {
      for (let r2 of r.results) {
        parseModel(r2, q.model, { parseJSON: true })
      }
    }
    return r.results
  }

  async count(table, q = {}) {
    if (typeof table != 'string') {
      q.model = table
    }
    let col = 'count(*)'
    q.columns = [col]
    let st = this.prepStmt(table, q)
    let r = await st.first()
    console.log('COUNT:', r)
    return r[col]
  }

  async first(table, q = {}) {
    if (typeof table != 'string') {
      q.model = table
    }
    q.limit = 1
    let st = this.prepStmt(table, q)
    let r = await st.first()
    // console.log("FIRST:", r)
    parseModel(r, q.model, { parseJSON: true })
    return r
  }

  prepStmt(table, q = {}) {
    // console.log("stmt", q)
    let cols = '*'
    if (q.columns) {
      cols = q.columns.join(', ')
    }
    let s = 'SELECT ' + cols + ' FROM ' + this.tableName(table)
    let w = []
    let binds = []
    if (q.where) {
      if (Array.isArray(q.where)) {
        if (q.where && q.where.length > 0) {
          let i = 0
          for (const q2 of q.where) {
            // console.log("Q2:", q2)
            if (q2[1].toLowerCase() == 'IS NOT NULL'.toLowerCase()) if (typeof q2[2] == 'undefined') continue
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
      if (w.length > 0) s += ' WHERE ' + w.join(' ')
    }
    if (q.order) {
      s += ' ORDER BY ' + q.order[0] + ' ' + q.order[1]
    }
    if (q.limit) s += ' LIMIT ' + q.limit
    if (q.offset) s += ' OFFSET ' + q.offset
    if (this.debug) console.log('SQL:', s, binds)
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

  /**
   * Insert a new record.
   *
   * @param {*} table
   * @param {*} obj the object to store.
   * @param {*} opts
   * @returns
   */
  async insert(table, obj, opts = {}) {
    if (typeof table != 'string') {
      opts.model = table
    }
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
    let s = `INSERT INTO ${this.tableName(table)} (${fields.join(', ')}) VALUES (${fields.map((f) => '?').join(',')})`
    if (this.debug) console.log('SQL:', s, values)
    let st = this.db.prepare(s).bind(...this.toValues(values))
    let r = await st.run()
    // let o = {}
    // fields.forEach((f, i) => o[f] = values[i])
    return { id: id, response: r, object: ob }
  }

  /**
   * Update an existing record.
   *
   * This will merge all data according to [rfc7396](https://datatracker.ietf.org/doc/html/rfc7396)
   *
   * @param {*} table
   * @param {*} id
   * @param {*} obj
   * @param {*} opts
   * @returns
   */
  async update(table, id, obj, opts = {}) {
    if (typeof table != 'string') {
      opts.model = table
    }
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
    let fieldsAndValues = this.toFields(fields, values, opts)
    values = fieldsAndValues.values
    let s = `UPDATE ${this.tableName(table)} SET ${fieldsAndValues.fieldString} WHERE id = ?`
    let vs = this.toValues(values)
    vs.push(id)
    if (this.debug) console.log('SQL:', s, vs)
    let st = this.db.prepare(s).bind(...vs)
    let r = await st.run()
    // let o = {}
    // fields.forEach((f, i) => o[f] = values[i])
    return { id: id, response: r, object: ob }
  }

  toValues(values) {
    return values.map((v) => {
      return this.toValue(v)
    })
  }

  toValue(v) {
    // console.log("type of v:", f, typeof v)
    if (v == null) return null
    if (v instanceof Date) return v.toISOString()
    let t = typeof v
    if (t == 'undefined') return null
    if (t == 'boolean') return v ? 1 : 0
    if (t === 'bigint') return v.toString()
    if (t == 'object') return JSON.stringify(v)
    return v
  }

  /**
   * Only if it's a basic object, not a date or anything else
   * @param {*} v
   * @returns
   */
  isObject(v) {
    if (v == null) return false
    if (v instanceof Date) return false
    if (typeof v == 'undefined') return false
    if (typeof v == 'boolean') return false
    if (typeof v == 'number') return false
    if (typeof v == 'bigint') return false
    return typeof v === 'object' && v !== null && !Array.isArray(v)
  }

  toFields(fields, values, opts) {
    // replacing: let s = `UPDATE ${table} SET ${fields.map(f => f + ' = ?').join(',')} WHERE id = ?`
    let r = ''
    let values2 = []
    for (let i = 0; i < fields.length; i++) {
      let f = fields[i]
      if (i > 0) r += ', '
      let vw = this.valueWrap(f, values[i], opts)
      r += f + ' = ' + vw.str
      for (let j = 0; j < vw.numValues; j++) {
        values2.push(values[i])
      }
      // if (vw.numValues > 1) {
      //   values.splice(i, 0, ...values.splice(i + 1, vw.numValues - 1))
      // }
    }
    return { fieldString: r, values: values2 }
  }

  valueWrap(f, v, opts) {
    if (opts.isUpdate && this.isObject(v)) {
      // console.log("isObject:", v)
      // then we'll do JSON patch here
      // stringifying so we don't need to have to bind values
      return { str: `IFNULL(?, json_patch(${f}, ?))`, numValues: 2 }
    }
    return { str: '?', numValues: 1 }
  }

  /**
   * Validates ob against clz
   * @param {*} ob
   * @param {*} model
   * @returns
   */
  validate(ob, model) {
    function formatError(props, p, val) {
      let t = props[p].type
      if (typeof t == 'function') {
        t = t.name
      }
      return `${p} has type ${t} but got value ${val} of type ${typeof val}`
    }

    const props = model.properties
    let errors = []
    for (const p in props) {
      const val = ob[p]
      console.log(p, val)
      if (val === undefined || val === null) { // TODO: might want to add notnull to property definition?
        continue
      }
      switch (props[p].type) {
        case String:
          break
        case Number:
          if (typeof val != 'number') {
            errors.push(formatError(props, p, val))
          }
          break
        case Boolean:
          if (typeof val != 'boolean') {
            errors.push(formatError(props, p, val))
          }
          break
        case Date:
          console.log(p, val, typeof val)
          if (typeof val != 'object' || !(val instanceof Date)) {
            errors.push(formatError(props, p, val))
          }
          break
        case BigInt:
          if (typeof val != 'object' || !(val instanceof BigInt)) {
            errors.push(formatError(props, p, val))
          }
          break
        case Object:
          if (typeof val != 'object') {
            errors.push(formatError(props, p, val))
          }
          break
        case JSON:
          break
        case BigInt:
          if (typeof val != 'object' || !(val instanceof Array)) {
            errors.push(formatError(props, p, val))
          }
          break
      }
    }
    if (errors.length != 0) {
      throw new Error(errors.join('\n'))
    }
    if (model.validate !== undefined) {
      model.validate(ob)
    }
  }
}

// this is copied from migrations, should share these. Probably in this library and have migrations use this.
export function toTableName(str) {
  return pluralize(toCamelCase(str))
}

function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1)
}

function pluralize(str) {
  return str + 's'
}

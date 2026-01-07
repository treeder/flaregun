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
   * @param {*} db a cloudflare d1 binding (ie: env.D1)
   */
  constructor(db) {
    this.db = db
    this.debug = false
  }

  prepare(s) {
    return this.db.prepare(s)
  }

  async retry(fn) {
    let attempt = 1
    while (true) {
      try {
        return await fn()
      } catch (err) {
        if (this.shouldRetry(err, attempt)) {
          if (this.debug) console.log(`Retrying D1 operation, attempt ${attempt}: ${err.message}`)
          // Exponential backoff
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 10 + Math.random() * 10))
          attempt++
          continue
        }
        throw err
      }
    }
  }

  shouldRetry(err, attempt) {
    const errMsg = String(err)
    const isRetryableError =
      errMsg.includes('Network connection lost') ||
      errMsg.includes('storage caused object to be reset') ||
      errMsg.includes('reset because its code was updated')
    return attempt <= 5 && isRetryableError
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
    if (!id) throw new Error('get needs an id')
    if (typeof table != 'string') {
      q.model = table
    }
    let r = await this.retry(async () => {
      return await this.db
        .prepare(`SELECT * FROM ${this.tableName(table)} where id = ?`)
        .bind(id)
        .first()
    })
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
    return await this.retry(async () => {
      return await this.db
        .prepare(`DELETE FROM ${this.tableName(table)} where id = ?`)
        .bind(id)
        .run()
    })
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
    let r = await this.retry(async () => {
      let st = this.prepStmt(table, q)
      return await st.all()
    })
    // console.log("QUERY:", r)
    if (q.model || q.join) {
      // then we need to do some parsing
      for (let r2 of r.results) {
        // If we are using the join trick, we don't want to parse the model on the row itself
        // unless the row itself is the model. But if it has nested objects, we should parse them?
        // For now, let's keep it as is, but we might need to change if 'r2' is a new object structure.
        if (q.join && !q.columns) {
          // We generated json_object columns. We need to parse them.
          // They are strings.
          let i = 0
          for (let k in r2) {
            if (typeof r2[k] === 'string' && (r2[k].startsWith('{') || r2[k].startsWith('['))) {
              try {
                r2[k] = JSON.parse(r2[k])
                if (i == 0) {
                  if (q.model) {
                    parseModel(r2[k], q.model, { parseJSON: true })
                  }
                } else if (i == 1) {
                  // todo: should allow more than a single join
                  if (q.join.model) {
                    parseModel(r2[k], q.model, { parseJSON: true })
                  }
                }
              } catch (e) {
                // ignore
              }
            }
          }
        } else {
          parseModel(r2, q.model, { parseJSON: true })
        }
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
    let r = await this.retry(async () => {
      let st = this.prepStmt(table, q)
      return await st.first()
    })
    console.log('COUNT:', r)
    return r[col]
  }

  async first(table, q = {}) {
    if (typeof table != 'string') {
      q.model = table
    }
    q.limit = 1
    let r = await this.retry(async () => {
      let st = this.prepStmt(table, q)
      return await st.first()
    })
    // console.log("FIRST:", r)
    parseModel(r, q.model, { parseJSON: true })
    return r
  }

  prepStmt(table, q = {}) {
    // console.log("stmt", q)
    let mainTableName = this.tableName(table)
    let knownTables = [mainTableName]
    let joins = []

    if (q.join) {
      if (Array.isArray(q.join)) {
        joins = q.join
      } else if (typeof q.join === 'object') {
        joins = [q.join]
      } else if (typeof q.join === 'string') {
        // string join, ignore for object processing
      }

      for (const j of joins) {
        if (j.table) {
          knownTables.push(this.tableName(j.table))
        }
      }
    }

    let cols = '*'
    if (q.columns) {
      cols = q.columns.join(', ')
    } else if (q.join) {
      // if columns are not specified, and we have a join, let's do the json_object trick
      let newCols = []
      if (typeof table !== 'string' && table.properties) {
        newCols.push(this.jsonObjectCol(table))
      }

      for (const j of joins) {
        if (typeof j.table !== 'string' && j.table.properties) {
          newCols.push(this.jsonObjectCol(j.table))
        }
      }
      if (newCols.length > 0) {
        cols = newCols.join(', ')
      }
    }

    let s = 'SELECT ' + cols + ' FROM ' + mainTableName
    if (q.join) {
      if (joins.length > 0) {
        for (const j of joins) {
          let onClause = j.on
          if (Array.isArray(j.on)) {
            let left = this.processCol(j.on[0], knownTables, mainTableName)
            let op = j.on[1]
            let right = this.processCol(j.on[2], knownTables, this.tableName(j.table))
            onClause = `${left} ${op} ${right}`
          }
          s += ` ${j.type || 'INNER'} JOIN ${this.tableName(j.table)} ON ${onClause}`
        }
      } else if (typeof q.join === 'string') {
        s += ' ' + q.join
      }
    }

    let w = []
    let binds = []

    // Process join wheres
    for (const j of joins) {
      if (j.where && j.table) {
        this.addWhere(j.where, w, binds, knownTables, this.tableName(j.table))
      }
    }

    // Process main where
    if (q.where) {
      let prefix = q.join ? mainTableName : null
      this.addWhere(q.where, w, binds, knownTables, prefix)
    }

    if (w.length > 0) s += ' WHERE ' + w.join(' ')

    if (q.order) {
      let o = q.order[0]
      if (q.join && !o.includes('.')) {
        o = mainTableName + '.' + o
      }
      s += ' ORDER BY ' + o + ' ' + q.order[1]
    }
    if (q.limit) s += ' LIMIT ' + q.limit
    if (q.offset) s += ' OFFSET ' + q.offset
    if (this.debug) console.log('SQL:', s, binds)
    let st = this.db.prepare(s).bind(...binds)
    return st
  }

  addWhere(whereClause, w, binds, knownTables, prefix) {
    if (Array.isArray(whereClause)) {
      if (whereClause.length > 0) {
        let i = 0
        for (const q2 of whereClause) {
          // console.log("Q2:", q2)
          if (q2[1].toLowerCase() == 'is not null'.toLowerCase()) continue

          if (w.length > 0) w.push(' AND')

          if (q2[1].toLowerCase() == 'or') {
            let w1 = this.singleW(q2[0], knownTables, prefix)
            let w2 = this.singleW(q2[2], knownTables, prefix)
            w.push(`(${w1.w.join(' ')} OR ${w2.w.join(' ')})`)
            binds.push(...w1.binds, ...w2.binds)
          } else {
            let w1 = this.singleW(q2, knownTables, prefix)
            w.push(w1.w.join(' '))
            binds.push(...w1.binds)
          }
          i++
        }
      }
    } else if (typeof whereClause === 'object') {
      // if where is an object, then just exact match
      let i = 0
      for (const q2 in whereClause) {
        // console.log("Q2:", q2)
        if (w.length > 0) w.push(' AND')
        let k = q2
        if (prefix && !k.includes('.')) {
          k = prefix + '.' + k
        }
        w.push(`${k} = ?`)
        binds.push(whereClause[q2])
        i++
      }
    } else {
      throw new Error("Unknown type for 'where', must be an array or object")
    }
  }

  processCol(col, knownTables = [], prefix = null) {
    let q0 = col

    // Auto prefix
    if (prefix && !q0.includes('.') && !(q0.includes('$') || q0.includes('('))) {
      q0 = prefix + '.' + q0
    }

    if (q0.includes('.') && !(q0.includes('$') || q0.includes('('))) {
      let split = q0.split('.')
      // Check if it's a known table
      if (knownTables.includes(split[0])) {
        // It's a table column, keep as is
      } else {
        // then it's a path into a json object. We reject $ and ( so it's not already an explicity json function
        q0 = `json_extract(${split[0]}, '$.${split.slice(1).join('.')}')`
      }
    }
    return q0
  }

  singleW(q2, knownTables = [], prefix = null) {
    let w = []
    let binds = []
    let q0 = this.processCol(q2[0], knownTables, prefix)

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
    let r = await this.retry(async () => {
      let st = this.db.prepare(s).bind(...this.toValues(values))
      return await st.run()
    })
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
    let r = await this.retry(async () => {
      let st = this.db.prepare(s).bind(...vs)
      return await st.run()
    })
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
      return { str: `json_patch(COALESCE(${f}, '{}'), ?)`, numValues: 1 }
    }
    return { str: '?', numValues: 1 }
  }

  jsonObjectCol(model) {
    let tableName = this.tableName(model)
    // alias?
    let alias = toCamelCase(model.name)
    let fields = Object.keys(model.properties)
    let args = fields.map((f) => `'${f}', ${tableName}.${f}`).join(', ')
    return `json_object(${args}) as "${alias}"`
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

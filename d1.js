import { nanoid } from "nanoid"

export class D1 {
    constructor(db) {
        this.db = db
    }

    prepare(s) {
        return this.db.prepare(s)
    }

    async query(table, q) {
        let st = this.prepStmt(table, q)
        let r = await st.all()
        console.log("QUERY:", r)
        return r.results
    }

    async first(table, q) {
        q.limit = 1
        let st = this.prepStmt(table, q)
        let r = await st.first()
        console.log("FIRST:", r)
        return r
    }

    prepStmt(table, q) {
        let w = []
        let binds = []
        if (q.where) {
            let i = 0
            for (const q2 of q.where) {
                console.log("Q2:", q2)
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
        let s = "SELECT * FROM " + table + " WHERE " + w.join(' ')
        if (q.order) {
            s += " ORDER BY " + q.order[0] + " " + q.order[1]

        }
        if (q.limit) s += " LIMIT " + q.limit
        // console.log("SQL:", s, binds)
        let st = this.db.prepare(s).bind(...binds)
        return st
    }

    singleW(q2) {
        let w = []
        let binds = []
        if (q2[1].toLowerCase() == 'is null') {
            w.push(` ${q2[0]} IS NULL`)
        } else if (q2[1].toLowerCase() == 'in') {
            w.push(` ${q2[0]} IN (${q2[2].map((_, i) => '?').join(',')})`)
            binds.push(...q2[2])
        } else {
            w.push(` ${q2[0]} ${q2[1]} ?`)
            binds.push(q2[2])
        }
        return { w, binds }
    }

    async insert(table, fields, values) {
        if (fields instanceof Object && !Array.isArray(fields)) {
            values = []
            let f2 = []
            for (const f in fields) {
                f2.push(f)
                values.push(fields[f])
            }
            fields = f2
        }
        let id
        if (!fields.includes('id')) {
            id = nanoid()
            fields.push('id')
            values.push(id)
        } else {
            id = values[fields.indexOf('id')]
        }
        fields.push('createdAt')
        fields.push('updatedAt')
        let now = new Date().toISOString()
        values.push(now)
        values.push(now)
        let s = `INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map(f => '?').join(',')})`
        // console.log("SQL:", s, values)
        let st = this.db.prepare(s).bind(...this.toValues(values))
        let r = await st.run()
        let o = {}
        fields.forEach((f, i) => o[f] = values[i])
        return { id: id, response: r, object: o }
    }

    async update(table, id, fields, values) {
        if (fields instanceof Object && !Array.isArray(fields)) {
            values = []
            let f2 = []
            for (const f in fields) {
                f2.push(f)
                values.push(fields[f])
            }
            fields = f2
        }
        fields.push('updatedAt')
        let now = new Date().toISOString()
        values.push(now)
        let s = `UPDATE ${table} SET ${fields.map(f => f + ' = ?').join(',')} WHERE id = ?`
        values.push(id)
        // console.log("SQL:", s, values)
        let st = this.db.prepare(s).bind(...this.toValues(values))
        let r = await st.run()
        let o = {}
        fields.forEach((f, i) => o[f] = values[i])
        return { id: id, response: r, object: o }
    }

    toValues(values) {
        return values.map(v => {
            if (typeof v == 'undefined') return null
            if (typeof v == 'object') return JSON.stringify(v)
            if (typeof v == 'boolean') return v ? 1 : 0
            return v
        })
    }

}

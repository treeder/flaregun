import 'dotenv/config'
import { API } from 'api'
import { TestKit } from 'testkit'
import { test1 } from './test1.js'
import { testJoin } from './test_join.js'
import { testJoinWhere } from './test_join_where.js'
import { testNulls } from './test_nulls.js'
import { testLeftJoinNull } from './test_left_join_null.js'
import { testObjectQuery } from './test_object_query.js'
import { testJoinJson } from './test_join_json.js'
import { testOr } from './test_or.js'

// Create the context for your tests, include anything the need to run
let apiURL = 'http://localhost:8787'
let api = new API({
  apiURL,
})

let c = {
  api,
  env: process.env,
}

let testKit = new TestKit(c, [
  test1,
  testJoin,
  testJoinWhere,
  testNulls,
  testLeftJoinNull,
  testObjectQuery,
  testJoinJson,
  testOr,
])
await testKit.run()

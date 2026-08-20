import { API } from 'api'
import 'dotenv/config'

const port = process.env.TEST_PORT || 8790

export const api = new API({
  apiURL: `http://localhost:${port}`,
})

export const c = {
  api,
  env: process.env,
}

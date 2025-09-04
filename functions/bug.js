import { APIError } from 'api'

export async function onRequestGet(c) {
  throw new APIError('bug!', { status: 500 })
}

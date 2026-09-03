import { test, expect, vi } from 'vitest'
import { CloudflareLogger } from '../logger.js'

test('CloudflareLogger log, info, warn, and error methods', () => {
  const logger = new CloudflareLogger({ data: { env: 'test' } })

  const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {})
  const spyInfo = vi.spyOn(console, 'info').mockImplementation(() => {})
  const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const spyError = vi.spyOn(console, 'error').mockImplementation(() => {})

  logger.log('log message')
  expect(spyLog).toHaveBeenCalledTimes(1)
  expect(spyLog).toHaveBeenCalledWith({
    env: 'test',
    level: 'info',
    message: 'log message',
  })

  logger.info('info message')
  expect(spyInfo).toHaveBeenCalledTimes(1)
  expect(spyInfo).toHaveBeenCalledWith({
    env: 'test',
    level: 'info',
    message: 'info message',
  })

  logger.warn('warn message')
  expect(spyWarn).toHaveBeenCalledTimes(1)
  expect(spyWarn).toHaveBeenCalledWith({
    env: 'test',
    level: 'warn',
    message: 'warn message',
  })

  logger.error('error message')
  expect(spyError).toHaveBeenCalledTimes(1)
  expect(spyError).toHaveBeenCalledWith({
    env: 'test',
    level: 'error',
    message: 'error message',
  })

  const err = new Error('something failed')
  logger.error('an error occurred', err)
  expect(spyError).toHaveBeenCalledTimes(2)
  const lastErrorCall = spyError.mock.calls[1][0]
  expect(lastErrorCall.level).toBe('error')
  expect(lastErrorCall.message).toBe('an error occurred something failed')
  expect(lastErrorCall.error).toBeDefined()
  expect(lastErrorCall.error.message).toBe('something failed')

  spyLog.mockRestore()
  spyInfo.mockRestore()
  spyWarn.mockRestore()
  spyError.mockRestore()
})

test('CloudflareLogger contextual cloning with .with()', () => {
  const logger = new CloudflareLogger({ data: { service: 'api' } })
  const childLogger = logger.with('userId', '123')

  const spyError = vi.spyOn(console, 'error').mockImplementation(() => {})

  childLogger.error('failed action', { action: 'delete' })
  expect(spyError).toHaveBeenCalledWith({
    service: 'api',
    userId: '123',
    level: 'error',
    message: 'failed action',
    data: { action: 'delete' },
  })

  spyError.mockRestore()
})

test('CloudflareLogger formats and serializes error cause chains', () => {
  const logger = new CloudflareLogger({ data: { env: 'test' } })
  const spyError = vi.spyOn(console, 'error').mockImplementation(() => {})

  const rootErr = new Error('root cause failure')
  const outerErr = new Error('operation failed', { cause: rootErr })

  logger.error('an error occurred', outerErr)

  expect(spyError).toHaveBeenCalledTimes(1)
  const logged = spyError.mock.calls[0][0]
  expect(logged.level).toBe('error')
  expect(logged.message).toBe('an error occurred operation failed (caused by: root cause failure)')
  expect(logged.error).toBeDefined()
  expect(logged.error.message).toBe('operation failed')
  expect(logged.error.cause).toBeDefined()
  expect(logged.error.cause.message).toBe('root cause failure')
  expect(logged.error.cause.stack).toBeDefined()

  // Test nested cause chains
  const deepRoot = new Error('database connection timeout')
  const midErr = new Error('query execution failed', { cause: deepRoot })
  const topErr = new Error('request handler failed', { cause: midErr })

  logger.error(topErr)
  expect(spyError).toHaveBeenCalledTimes(2)
  const loggedNested = spyError.mock.calls[1][0]
  expect(loggedNested.message).toBe(
    'request handler failed (caused by: query execution failed: database connection timeout)',
  )
  expect(loggedNested.error.cause.cause.message).toBe('database connection timeout')

  spyError.mockRestore()
})

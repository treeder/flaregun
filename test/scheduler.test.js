import { describe, it, expect, vi } from 'vitest'
import { Scheduler } from '../scheduler.js'

describe('Scheduler', () => {
  function createMockController(dateString) {
    const scheduledTime = new Date(dateString).getTime()
    return { scheduledTime }
  }

  const mockContext = {}

  it('runs minute event on every scheduled time', async () => {
    const scheduler = new Scheduler()
    const fn = vi.fn()
    scheduler.addEventListener('minute', fn)

    const controller = createMockController('2026-08-10T10:15:00Z')
    await scheduler.run(mockContext, controller)

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('runs 5minutes, 10minutes, and 15minutes events appropriately', async () => {
    const scheduler = new Scheduler()
    const fn5 = vi.fn()
    const fn10 = vi.fn()
    const fn15 = vi.fn()

    scheduler.addEventListener('5minutes', fn5)
    scheduler.addEventListener('10minutes', fn10)
    scheduler.addEventListener('15minutes', fn15)

    // At 10:05:00: 5minutes triggers, 10minutes and 15minutes do not
    await scheduler.run(mockContext, createMockController('2026-08-10T10:05:00Z'))
    expect(fn5).toHaveBeenCalledTimes(1)
    expect(fn10).toHaveBeenCalledTimes(0)
    expect(fn15).toHaveBeenCalledTimes(0)

    // At 10:10:00: 5minutes and 10minutes trigger, 15minutes does not
    await scheduler.run(mockContext, createMockController('2026-08-10T10:10:00Z'))
    expect(fn5).toHaveBeenCalledTimes(2)
    expect(fn10).toHaveBeenCalledTimes(1)
    expect(fn15).toHaveBeenCalledTimes(0)

    // At 10:15:00: 5minutes and 15minutes trigger, 10minutes does not
    await scheduler.run(mockContext, createMockController('2026-08-10T10:15:00Z'))
    expect(fn5).toHaveBeenCalledTimes(3)
    expect(fn10).toHaveBeenCalledTimes(1)
    expect(fn15).toHaveBeenCalledTimes(1)

    // At 10:20:00: 5minutes and 10minutes trigger
    await scheduler.run(mockContext, createMockController('2026-08-10T10:20:00Z'))
    expect(fn5).toHaveBeenCalledTimes(4)
    expect(fn10).toHaveBeenCalledTimes(2)
    expect(fn15).toHaveBeenCalledTimes(1)
  })

  it('runs day event at default hour 0 (midnight)', async () => {
    const scheduler = new Scheduler()
    const fn = vi.fn()
    scheduler.addEventListener('day', fn)

    // Midnight UTC (00:00)
    await scheduler.run(mockContext, createMockController('2026-08-10T00:00:00Z'))
    expect(fn).toHaveBeenCalledTimes(1)

    // 03:00 UTC
    await scheduler.run(mockContext, createMockController('2026-08-10T03:00:00Z'))
    expect(fn).toHaveBeenCalledTimes(1) // still 1 (not called again)
  })

  it('runs day event at custom hour set in addEventListener options', async () => {
    const scheduler = new Scheduler()
    const fnDefault = vi.fn()
    const fn2am = vi.fn()
    const fn8pm = vi.fn()

    scheduler.addEventListener('day', fnDefault)
    scheduler.addEventListener('day', fn2am, { hour: 2 })
    scheduler.addEventListener('day', fn8pm, { hour: 20 })

    // 00:00 UTC -> fnDefault fires
    await scheduler.run(mockContext, createMockController('2026-08-10T00:00:00Z'))
    expect(fnDefault).toHaveBeenCalledTimes(1)
    expect(fn2am).toHaveBeenCalledTimes(0)
    expect(fn8pm).toHaveBeenCalledTimes(0)

    // 02:00 UTC -> fn2am fires
    await scheduler.run(mockContext, createMockController('2026-08-10T02:00:00Z'))
    expect(fnDefault).toHaveBeenCalledTimes(1)
    expect(fn2am).toHaveBeenCalledTimes(1)
    expect(fn8pm).toHaveBeenCalledTimes(0)

    // 20:00 UTC -> fn8pm fires
    await scheduler.run(mockContext, createMockController('2026-08-10T20:00:00Z'))
    expect(fnDefault).toHaveBeenCalledTimes(1)
    expect(fn2am).toHaveBeenCalledTimes(1)
    expect(fn8pm).toHaveBeenCalledTimes(1)
  })

  it('removes event listeners properly', async () => {
    const scheduler = new Scheduler()
    const fn = vi.fn()

    scheduler.addEventListener('day', fn, { hour: 5 })
    scheduler.removeEventListener('day', fn)

    await scheduler.run(mockContext, createMockController('2026-08-10T05:00:00Z'))
    expect(fn).toHaveBeenCalledTimes(0)
  })
})

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SLOT_MINUTES,
  snapMinutesToSlot,
  minutesFromDayStartFromY,
  localDayMinutesToIso,
  addMs,
  layoutTaskBlockForDay,
  layoutFromMinuteRange,
  shiftDateKey,
  getTaskMinutesIfFullyOnLocalDay,
} from '@/utils/day-calendar'
import type { Task } from '@/types/task'

describe('day-calendar utils', () => {
  it('snapMinutesToSlot rounds down to slot', () => {
    expect(snapMinutesToSlot(14, DEFAULT_SLOT_MINUTES)).toBe(0)
    expect(snapMinutesToSlot(29, DEFAULT_SLOT_MINUTES)).toBe(0)
    expect(snapMinutesToSlot(30, DEFAULT_SLOT_MINUTES)).toBe(30)
    expect(snapMinutesToSlot(45, DEFAULT_SLOT_MINUTES)).toBe(30)
  })

  it('minutesFromDayStartFromY maps Y to minutes', () => {
    const h = 1152
    expect(minutesFromDayStartFromY(0, h, 24 * 60)).toBe(0)
    expect(minutesFromDayStartFromY(h / 2, h, 24 * 60)).toBe(12 * 60)
    expect(minutesFromDayStartFromY(h, h, 24 * 60)).toBe(24 * 60)
  })

  it('localDayMinutesToIso produces parseable ISO', () => {
    const iso = localDayMinutesToIso('2026-04-16', 90)
    expect(Number.isNaN(new Date(iso).getTime())).toBe(false)
  })

  it('addMs offsets ISO string', () => {
    const a = localDayMinutesToIso('2026-04-16', 0)
    const b = addMs(a, 3600000)
    expect(new Date(b).getTime() - new Date(a).getTime()).toBe(3600000)
  })

  it('shiftDateKey moves by days', () => {
    expect(shiftDateKey('2026-04-16', 1)).toBe('2026-04-17')
    expect(shiftDateKey('2026-04-16', -1)).toBe('2026-04-15')
  })

  it('layoutFromMinuteRange matches duration', () => {
    const h = 1152
    const L = layoutFromMinuteRange(600, 660, h, 24 * 60)
    expect(L.heightPx).toBeGreaterThan(0)
    expect(L.topPx).toBe((600 / (24 * 60)) * h)
  })

  it('layoutTaskBlockForDay returns layout when task spans day', () => {
    const task: Task = {
      id: '1',
      title: 't',
      scores: { importance: 3, urgency: 3 },
      completed: false,
      startDate: '2026-04-16T10:00:00.000Z',
      deadline: '2026-04-16T11:00:00.000Z',
    }
    const layout = layoutTaskBlockForDay(task, '2026-04-16', 1440, 24 * 60)
    expect(layout).not.toBeNull()
    expect(layout!.topPx).toBeGreaterThanOrEqual(0)
    expect(layout!.heightPx).toBeGreaterThan(0)
  })

  it('getTaskMinutesIfFullyOnLocalDay returns minutes when both bounds on same local day', () => {
    const dayKey = '2026-06-15'
    const startIso = localDayMinutesToIso(dayKey, 10 * 60)
    const endIso = localDayMinutesToIso(dayKey, 11 * 60)
    const task: Task = {
      id: '1',
      title: 't',
      scores: { importance: 3, urgency: 3 },
      completed: false,
      startDate: startIso,
      deadline: endIso,
    }
    const r = getTaskMinutesIfFullyOnLocalDay(task, dayKey)
    expect(r).not.toBeNull()
    expect(r!.startMin).toBe(10 * 60)
    expect(r!.endMin).toBe(11 * 60)
  })

  it('getTaskMinutesIfFullyOnLocalDay returns null when range crosses local midnight', () => {
    const dayKey = '2026-06-15'
    const startIso = localDayMinutesToIso(dayKey, 23 * 60)
    const endIso = localDayMinutesToIso('2026-06-16', 1 * 60)
    const task: Task = {
      id: '1',
      title: 't',
      scores: { importance: 3, urgency: 3 },
      completed: false,
      startDate: startIso,
      deadline: endIso,
    }
    expect(getTaskMinutesIfFullyOnLocalDay(task, dayKey)).toBeNull()
  })
})

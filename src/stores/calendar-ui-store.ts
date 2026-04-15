import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getWeekDaysMonSun,
  parseLocalDateKey,
  getTodayLocalDateKey,
  resolveTaskCalendarDateKey,
} from '@/utils/task-calendar'
import type { Task } from '@/types/task'
import type { MonthGridCell } from '@/utils/task-calendar'

export const useCalendarUiStore = defineStore('calendarUi', () => {
  const selectedCalendarDay = ref<string | null>(getTodayLocalDateKey())
  const calendarView = ref({ year: new Date().getFullYear(), month: new Date().getMonth() })

  /** 주간 범위는 항상 선택일(없으면 오늘)이 속한 월~일 주 — weekAnchor 분리 시 도넛·라벨이 어긋나지 않도록 단일 기준 */
  const weekCells = computed(() => {
    const key = selectedCalendarDay.value ?? getTodayLocalDateKey()
    return getWeekDaysMonSun(parseLocalDateKey(key))
  })

  const weekRangeLabel = computed(() => {
    const cells = weekCells.value
    if (cells.length < 7) return ''
    const da = parseLocalDateKey(cells[0].dateKey)
    const db = parseLocalDateKey(cells[6].dateKey)
    const sameMonth = da.getMonth() === db.getMonth() && da.getFullYear() === db.getFullYear()
    if (sameMonth) {
      return `${da.getFullYear()}년 ${da.getMonth() + 1}월 ${da.getDate()}일–${db.getDate()}일`
    }
    return `${da.getMonth() + 1}/${da.getDate()} – ${db.getMonth() + 1}/${db.getDate()}`
  })

  const weekBounds = computed(() => {
    const cells = weekCells.value
    if (cells.length < 7) return { start: '', end: '' }
    return { start: cells[0].dateKey, end: cells[6].dateKey }
  })

  function setSelectedDayFromMonth(mcell: MonthGridCell) {
    selectedCalendarDay.value = mcell.dateKey
  }

  function shiftCalendarMonth(delta: number) {
    const d = new Date(calendarView.value.year, calendarView.value.month + delta, 1)
    calendarView.value = { year: d.getFullYear(), month: d.getMonth() }
  }

  function goToToday() {
    const now = new Date()
    selectedCalendarDay.value = getTodayLocalDateKey()
    calendarView.value = { year: now.getFullYear(), month: now.getMonth() }
  }

  function setSelectedDayKey(dateKey: string) {
    selectedCalendarDay.value = dateKey
    const d = parseLocalDateKey(dateKey)
    calendarView.value = { year: d.getFullYear(), month: d.getMonth() }
  }

  function applyForTask(task: Task) {
    const key = resolveTaskCalendarDateKey(task)
    selectedCalendarDay.value = key
    const d = parseLocalDateKey(key)
    calendarView.value = { year: d.getFullYear(), month: d.getMonth() }
  }

  return {
    selectedCalendarDay,
    calendarView,
    weekCells,
    weekRangeLabel,
    weekBounds,
    setSelectedDayFromMonth,
    shiftCalendarMonth,
    goToToday,
    setSelectedDayKey,
    applyForTask,
  }
})

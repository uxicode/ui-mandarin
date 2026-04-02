import type { Task } from '@/types/task'

/** 로컬 캘린더 기준 YYYY-MM-DD */
export function isoToLocalDateKey(iso: string | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 로컬 캘린더 기준 오늘의 YYYY-MM-DD */
export function getTodayLocalDateKey(): string {
  return formatLocalDateKey(new Date())
}

/** `startKey` ~ `endKey` inclusive, 로컬 날짜 기준 (YYYY-MM-DD 문자열 정렬 가능) */
export function enumerateDaysInclusive(startKey: string, endKey: string): string[] {
  let a = startKey
  let b = endKey
  if (a > b) {
    const t = a
    a = b
    b = t
  }
  const out: string[] = []
  const cur = parseLocalDateKey(a)
  const end = parseLocalDateKey(b)
  while (cur <= end) {
    out.push(formatLocalDateKey(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

/**
 * 업무가 달력에 걸치는 로컬 날짜 키 목록 (중복 없음, 정렬).
 * - 시작·마감 둘 다: 닫힌 구간 전체
 * - 하나만: 그 하루
 * - 둘 다 없음: 빈 배열
 */
export function getTaskSpanDateKeys(task: Task): string[] {
  const start = task.startDate ? isoToLocalDateKey(task.startDate) : null
  const end = task.deadline ? isoToLocalDateKey(task.deadline) : null
  if (!start && !end) return []
  if (start && !end) return [start]
  if (!start && end) return [end]
  return enumerateDaysInclusive(start!, end!)
}

/** `dateKey`가 해당 업무 일정에 포함되는지 */
export function taskHasDateOnCalendar(task: Task, dateKey: string): boolean {
  return getTaskSpanDateKeys(task).includes(dateKey)
}

/**
 * 목록·주간 스트립 동기화용 대표 날짜 키 (마감 우선, 없으면 시작, 없으면 구간 첫날).
 * 일정 없음: null
 */
export function getTaskRepresentativeDateKey(task: Task): string | null {
  const keys = getTaskSpanDateKeys(task)
  if (keys.length === 0) return null
  const dk = task.deadline ? isoToLocalDateKey(task.deadline) : null
  const sk = task.startDate ? isoToLocalDateKey(task.startDate) : null
  if (dk && keys.includes(dk)) return dk
  if (sk && keys.includes(sk)) return sk
  return keys[0]
}

/**
 * 목록·주간 스트립 동기화용 날짜 키.
 * 일정이 있으면 대표 일정일, 없으면 생성일(로컬), 없으면 수정일, 없으면 오늘.
 */
export function resolveTaskCalendarDateKey(task: Task): string {
  const rep = getTaskRepresentativeDateKey(task)
  if (rep !== null) return rep
  if (task.createdAt) {
    const k = isoToLocalDateKey(task.createdAt)
    if (k) return k
  }
  if (task.updatedAt) {
    const k = isoToLocalDateKey(task.updatedAt)
    if (k) return k
  }
  return getTodayLocalDateKey()
}

/** 월요일 00:00 로컬 기준 주 시작 */
export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = x.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  x.setDate(x.getDate() + diff)
  return x
}

/** `d`가 속한 주의 월요일(로컬) YYYY-MM-DD */
export function getWeekStartMondayKey(d: Date = new Date()): string {
  return formatLocalDateKey(startOfWeekMonday(d))
}

/**
 * 우선순위 매트릭스: 완료 업무는 일정 구간의 마지막 날이 금주 월요일 이전이면 제외.
 * 일정이 없으면 그대로 포함.
 */
export function includeCompletedTaskInMatrix(task: Task, weekStartMondayKey: string): boolean {
  if (!task.completed) return true
  const keys = getTaskSpanDateKeys(task)
  if (keys.length === 0) return true
  const lastKey = keys[keys.length - 1]
  return lastKey >= weekStartMondayKey
}

export interface WeekDayCell {
  dateKey: string
  /** 표시용 일 (1~31) */
  dayOfMonth: number
  /** 요일 한글 한 글자 (월~일) */
  weekdayLabel: string
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

/** 금주 월~일 7칸 (anchor 기준 그 주) */
export function getWeekDaysMonSun(anchor: Date): WeekDayCell[] {
  const start = startOfWeekMonday(anchor)
  const cells: WeekDayCell[] = []
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const dateKey = formatLocalDateKey(cur)
    cells.push({
      dateKey,
      dayOfMonth: cur.getDate(),
      weekdayLabel: WEEKDAY_LABELS[cur.getDay()],
    })
  }
  return cells
}

/** 해당 로컬 날짜가 속한 월~일 주의 시작·끝 dateKey */
export function getWeekBoundsMonSunForDateKey(dateKey: string): { start: string; end: string } | null {
  const d = parseLocalDateKey(dateKey)
  const cells = getWeekDaysMonSun(d)
  if (cells.length < 7) return null
  return { start: cells[0]!.dateKey, end: cells[6]!.dateKey }
}

/** 해당 날짜에 일정이 걸린 업무 수 (0, 1, 2+ 구간용). 일정 없으면 생성일 앵커가 해당 날짜일 때 포함 */
export function countTasksOnDate(tasks: Task[], dateKey: string): number {
  let n = 0
  for (const task of tasks) {
    const span = getTaskSpanDateKeys(task)
    if (span.includes(dateKey)) {
      n += 1
      continue
    }
    if (span.length === 0 && resolveTaskCalendarDateKey(task) === dateKey) n += 1
  }
  return n
}

/** 점 표시: 0개 → 0, 1개 → 1, 2개 이상 → 2 */
export function dotCountForDay(taskCount: number): 0 | 1 | 2 {
  if (taskCount <= 0) return 0
  if (taskCount === 1) return 1
  return 2
}

/** 월 그리드용 (월~일 6주, 42칸). `inMonth`로 해당 월이 아닌 날 표시 */
export interface MonthGridCell {
  dateKey: string
  dayOfMonth: number
  inMonth: boolean
}

export function getMonthGrid(year: number, monthIndex: number): MonthGridCell[] {
  const first = new Date(year, monthIndex, 1)
  const gridStart = startOfWeekMonday(first)
  const cells: MonthGridCell[] = []
  for (let i = 0; i < 42; i++) {
    const cur = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    const dateKey = formatLocalDateKey(cur)
    cells.push({
      dateKey,
      dayOfMonth: cur.getDate(),
      inMonth: cur.getMonth() === monthIndex,
    })
  }
  return cells
}

<template>
  <div class="task-timeline">
    <!-- 내비게이션 -->
    <div class="task-timeline__nav">
      <button
        v-if="hasPrev"
        type="button"
        class="task-timeline__nav-btn"
        @click="goPrev"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-timeline__nav-icon">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        이전
      </button>
      <span v-else class="task-timeline__nav-placeholder" />

      <span class="task-timeline__nav-label">{{ rangeLabel }}</span>

      <button
        v-if="hasNext"
        type="button"
        class="task-timeline__nav-btn"
        @click="goNext"
      >
        다음
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-timeline__nav-icon">
          <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <span v-else class="task-timeline__nav-placeholder" />
    </div>

    <!-- 슬라이드 트랜지션 래퍼 -->
    <Transition :name="slideTransitionName" mode="out-in">
      <!-- 빈 상태 -->
      <div v-if="visibleColumns.length === 0" :key="`empty-${periodOffset}`" class="task-timeline__empty">
        <p>이 기간에 등록된 업무가 없습니다.</p>
      </div>

      <!-- 날짜 컬럼들 -->
      <div v-else :key="`track-${periodOffset}`" ref="trackRef" class="task-timeline__track" :class="{ 'task-timeline__track--dragging': isDragging }">
        <div
          v-for="col in visibleColumns"
          :key="col.dateKey"
          class="task-timeline__col"
          :class="{
            'task-timeline__col--today': col.dateKey === todayKey,
            'task-timeline__col--no-date': col.dateKey === 'no-date',
          }"
        >
          <!-- 컬럼 헤더 -->
          <div class="task-timeline__col-header">
            <span class="task-timeline__col-label">{{ col.label }}</span>
            <span class="task-timeline__col-count">{{ col.tasks.length }}</span>
          </div>

          <!-- 태스크 카드 목록 -->
          <div class="task-timeline__cards">
            <button
              v-for="task in col.tasks"
              :key="task.id"
              type="button"
              class="task-timeline__card"
              :class="[
                getCardStatusClass(task),
                { 'task-timeline__card--selected': props.selectedTaskId === task.id }
              ]"
              @click="emit('select', task.id)"
            >
              <!-- 완료 체크 뱃지 -->
              <span v-if="task.completed" class="task-timeline__card-check" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="task-timeline__card-check-icon">
                  <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>

              <span
                class="task-timeline__card-title"
                :class="{ 'task-timeline__card-title--completed': task.completed }"
              >{{ task.title }}</span>

              <!-- 시작 시각 -->
              <span v-if="task.startDate" class="task-timeline__card-time">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-timeline__card-icon">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                {{ formatTime(task.startDate) }}
              </span>

              <!-- 기한 -->
              <span
                v-if="task.deadline"
                class="task-timeline__card-deadline"
                :class="{ 'task-timeline__card-deadline--overdue': isTaskOverdue(task) }"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-timeline__card-icon">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {{ formatTime(task.deadline) }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDragScroll } from '@/composables/use-drag-scroll'
import { useTaskStore } from '@/stores/task-store'
import type { Task } from '@/types/task'

interface Props {
  selectedTaskId?: string
}

interface Emits {
  (e: 'select', taskId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()

const { elRef: trackRef, isDragging } = useDragScroll()

// 현재 분기 오프셋 (0 = 이번 분기, -1 = 전 분기, +1 = 다음 분기)
const periodOffset = ref(0)
const slideDirection = ref<'left' | 'right'>('left')

const slideTransitionName = computed(() =>
  slideDirection.value === 'left' ? 'tl-slide-left' : 'tl-slide-right'
)

function goNext() {
  slideDirection.value = 'left'
  periodOffset.value++
}

function goPrev() {
  slideDirection.value = 'right'
  periodOffset.value--
}

interface TimelineColumn {
  dateKey: string  // 'YYYY-MM-DD' | 'no-date'
  label: string
  tasks: Task[]
}

// ── 날짜 유틸 ──────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const todayKey = toDateKey(new Date())

/** 현재 오프셋 기준 분기(3달) 범위 */
const monthRange = computed(() => {
  const now = new Date()
  // 이번 분기의 시작 월 인덱스 (0-based): 0→Q1(0), 1→Q2(3), 2→Q3(6), 3→Q4(9)
  const baseQuarter = Math.floor(now.getMonth() / 3)
  const targetQuarter = baseQuarter + periodOffset.value
  const startMonthIndex = targetQuarter * 3          // 분기 첫 달 (0-based)
  const endMonthIndex = startMonthIndex + 2          // 분기 마지막 달 (0-based)
  const first = new Date(now.getFullYear(), startMonthIndex, 1)
  const last = new Date(now.getFullYear(), endMonthIndex + 1, 0) // 다음달 0일 = 말일
  const quarter = ((targetQuarter % 4) + 4) % 4 + 1  // 1~4 (음수 오프셋도 정상 처리)
  return {
    start: toDateKey(first),
    end: toDateKey(last),
    year: first.getFullYear(),
    quarter,
    startMonth: first.getMonth() + 1,
    endMonth: last.getMonth() + 1,
  }
})

const rangeLabel = computed(() => {
  const { year, quarter, startMonth, endMonth } = monthRange.value
  return `${year}년 ${quarter}분기 (${startMonth}월~${endMonth}월)`
})

// ── 태스크 유틸 ───────────────────────────────────────────

function getPrimaryDateKey(task: Task): string | null {
  return task.startDate?.slice(0, 10)
    ?? task.deadline?.slice(0, 10)
    ?? task.createdAt?.slice(0, 10)
    ?? null
}

function formatColumnLabel(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const month = d.getMonth() + 1
  const day = d.getDate()
  const week = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${month}/${day}(${week})`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function isTaskOverdue(task: Task): boolean {
  if (!task.deadline || task.completed) return false
  return task.deadline.slice(0, 10) < todayKey
}

function getCardStatusClass(task: Task): string {
  if (task.completed) return 'task-timeline__card--completed'
  if (isTaskOverdue(task)) return 'task-timeline__card--overdue'
  return 'task-timeline__card--active'
}

// ── 전체 날짜 키 목록 (prev/next 판단용) ─────────────────

const allDatedKeys = computed<string[]>(() => {
  const keys = new Set<string>()
  for (const task of taskStore.tasks) {
    const key = getPrimaryDateKey(task)
    if (key) keys.add(key)
  }
  return [...keys].sort()
})

const hasPrev = computed(() =>
  allDatedKeys.value.some(k => k < monthRange.value.start)
)

const hasNext = computed(() =>
  allDatedKeys.value.some(k => k > monthRange.value.end)
)

// ── 현재 기간 컬럼 ────────────────────────────────────────

const visibleColumns = computed<TimelineColumn[]>(() => {
  const { start, end } = monthRange.value
  const map = new Map<string, Task[]>()

  for (const task of taskStore.tasks) {
    const key = getPrimaryDateKey(task)
    if (key === null) {
      // 날짜 없는 업무는 현재 기간 뷰에만 노출
      if (periodOffset.value === 0) {
        const list = map.get('no-date') ?? []
        list.push(task)
        map.set('no-date', list)
      }
      continue
    }
    if (key < start || key > end) continue
    const list = map.get(key) ?? []
    list.push(task)
    map.set(key, list)
  }

  const dated: TimelineColumn[] = []
  for (const [key, tasks] of map.entries()) {
    if (key === 'no-date') continue
    dated.push({ dateKey: key, label: formatColumnLabel(key), tasks })
  }
  dated.sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  const noDated = map.get('no-date') ?? []
  if (noDated.length > 0) {
    dated.push({ dateKey: 'no-date', label: '날짜 없음', tasks: noDated })
  }

  return dated
})
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.task-timeline {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  min-height: 0;
  // flex: 1;
}

// ── 슬라이드 트랜지션 ─────────────────────────────────────

.tl-slide-left-enter-active,
.tl-slide-left-leave-active,
.tl-slide-right-enter-active,
.tl-slide-right-leave-active {
  transition:
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

// 다음 (왼쪽으로)
.tl-slide-left-enter-from {
  transform: translateX(48px);
  opacity: 0;
}
.tl-slide-left-leave-to {
  transform: translateX(-48px);
  opacity: 0;
}

// 이전 (오른쪽으로)
.tl-slide-right-enter-from {
  transform: translateX(-48px);
  opacity: 0;
}
.tl-slide-right-leave-to {
  transform: translateX(48px);
  opacity: 0;
}

// ── 내비게이션 ───────────────────────────────────────────

.task-timeline__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  flex-shrink: 0;
}

.task-timeline__nav-label {
  font-size: 0.8125rem;
  font-weight: 700;
  color: $color-gray-800;
}

.task-timeline__nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  font-size: 0.8125rem;
  font-weight: 500;
  color: $color-gray-600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;

  &:hover {
    background: $color-gray-50;
    border-color: $color-gray-400;
    color: $color-gray-800;
  }
}

.task-timeline__nav-icon {
  width: 14px;
  height: 14px;
}

.task-timeline__nav-placeholder {
  width: 72px;
}

// ── 빈 상태 ─────────────────────────────────────────────

.task-timeline__empty {
  @include flex-center;
  min-height: 200px;
  font-size: 0.875rem;
  color: $color-gray-400;
}

// ── 가로 스크롤 트랙 ─────────────────────────────────────

.task-timeline__track {
  display: flex;
  gap: $spacing-md;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: $spacing-md;
  align-items: flex-start;
  flex: 1;
  cursor: grab;

  &--dragging {
    cursor: grabbing;

    // 드래그 중 카드 버튼의 hover 효과 억제
    .task-timeline__card {
      pointer-events: none;
    }
  }

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-track {
    background: $color-gray-100;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: $color-gray-300;
    border-radius: 3px;

    &:hover {
      background: $color-gray-400;
    }
  }
}

// ── 날짜 컬럼 ────────────────────────────────────────────

.task-timeline__col {
  min-width: 190px;
  max-width: 190px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &--today {
    .task-timeline__col-header {
      border-bottom-color: $color-warning;
    }

    .task-timeline__col-label {
      color: $color-warning;
    }

    .task-timeline__col-count {
      background: rgba($color-warning, 0.15);
      color: darken(#f59e0b, 15%);
    }
  }

  &--no-date {
    opacity: 0.75;

    .task-timeline__col-header {
      border-bottom-color: $color-gray-300;
    }

    .task-timeline__col-count {
      background: $color-gray-100;
      color: $color-gray-500;
    }
  }
}

.task-timeline__col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: $spacing-sm;
  border-bottom: 2px solid $color-primary;
  margin-bottom: $spacing-xs;
}

.task-timeline__col-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: $color-gray-800;
}

.task-timeline__col-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba($color-primary, 0.12);
  font-size: 0.6875rem;
  font-weight: 700;
  color: $color-primary-dark;
}

// ── 카드 ────────────────────────────────────────────────

.task-timeline__cards {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.task-timeline__card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  background: $color-white;
  box-shadow: $shadow-sm;
  border: 1px solid $color-gray-200;
  border-left: 3px solid $color-primary;
  text-align: left;
  cursor: pointer;
  transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
  position: relative;

  &:hover {
    box-shadow: $shadow-md;
    transform: translateY(-1px);
  }

  &--active {
    border-left-color: $color-primary;
  }

  &--overdue {
    border-left-color: $color-danger;
    background: rgba($color-danger, 0.02);
  }

  &--completed {
    border-left-color: $color-success;
    opacity: 0.75;
  }

  &--selected {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba($color-primary, 0.25), $shadow-sm;
    transform: translateY(-1px);
  }
}

.task-timeline__card-check {
  position: absolute;
  top: $spacing-sm;
  right: $spacing-sm;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: $color-success;
  color: $color-white;
  flex-shrink: 0;
}

.task-timeline__card-check-icon {
  width: 10px;
  height: 10px;
}

.task-timeline__card-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-gray-800;
  line-height: 1.4;
  word-break: break-word;
  padding-right: 20px;

  &--completed {
    text-decoration: line-through;
    color: $color-gray-400;
  }
}

.task-timeline__card-time,
.task-timeline__card-deadline {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.6875rem;
  color: $color-gray-500;
}

.task-timeline__card-deadline--overdue {
  color: $color-danger;
  font-weight: 600;
}

.task-timeline__card-icon {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}
</style>

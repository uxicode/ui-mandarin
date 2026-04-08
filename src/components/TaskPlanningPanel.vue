<template>
  <div class="task-planning">
    <div class="task-planning__feedback" aria-label="업무 피드백">
      <!-- 헤더 행: 타이틀 + 도움말 아이콘 + 월간 리포트 버튼 -->
      <div class="task-planning__feedback-topbar">
        <span class="task-planning__feedback-label">피드백</span>
        <div class="task-planning__intro-wrap">
          <button
            ref="introBtnRef"
            type="button"
            class="task-planning__intro-btn"
            aria-label="피드백 안내"
            @mouseenter="openIntroTooltip"
            @mouseleave="closeIntroTooltip"
            @focus="openIntroTooltip"
            @blur="closeIntroTooltip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-planning__intro-icon">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
            </svg>
          </button>
          <Teleport to="body">
            <div
              class="task-planning__intro-tooltip"
              :class="{ 'task-planning__intro-tooltip--visible': showIntroTooltip }"
              :style="{ top: introTooltipPos.top + 'px', left: introTooltipPos.left + 'px' }"
              role="tooltip"
            >
              캘린더에서 선택한 날 기준으로 일간(진행중·기한초과·완료)과 주간(완료·미완료)을 표시합니다. 미완료가 없으면 칭찬 릴레이가 나와요.
            </div>
          </Teleport>
        </div>
      </div>

      <button
        type="button"
        class="task-planning__monthly-btn"
        @click="showMonthly = !showMonthly"
      >
        <svg v-if="showMonthly" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-planning__monthly-btn-icon">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        {{ showMonthly ? '돌아가기' : '월간 리포트' }}
      </button>

      <!-- 슬라이드 래퍼 -->
      <div class="task-planning__panel-wrap">
        <!-- 일간·주간 도넛 + 상세 영역 -->
        <div
          class="task-planning__feedback-body"
          :class="{ 'task-planning__feedback-body--hidden': showMonthly }"
        >

      <!-- 주간 내비게이션 -->
      <div class="task-planning__week-nav">
        <button type="button" class="task-planning__week-nav-btn" aria-label="이전 주" @click="shiftWeek(-1)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-planning__week-nav-icon">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span class="task-planning__week-nav-label">{{ weekRangeLabel }}</span>
        <button type="button" class="task-planning__week-nav-btn" aria-label="다음 주" @click="shiftWeek(1)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-planning__week-nav-icon">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <button type="button" class="task-planning__week-nav-today" @click="calendarStore.goToToday()">
          이번주
        </button>
      </div>

      <div
        class="task-planning__donuts"
        :class="{
          'task-planning__donuts--daily-only': !showWeeklyFeedbackChart,
          'task-planning__donuts--both': showWeeklyFeedbackChart,
        }"
      >
        <FeedbackDonut
          v-if="dailyUseDonut"
          title="일간"
          :subtitle="`${feedbackDayLabel} 기준`"
          :segments="dailyDonutSegments"
          :selected-key="selectedFeedback?.scope === 'daily' ? selectedFeedback.key : null"
          @segment-click="onDailySegmentClick"
        />
        <div v-else-if="dailyNoSchedule" class="task-planning__feedback-slot-empty" role="status">
          <h4 class="task-planning__relay-title">일간</h4>
          <p class="task-planning__relay-sub">{{ feedbackDayLabel }} 기준</p>
          <p class="task-planning__slot-empty-text">이 날짜에 배정된 일정이 없어요.</p>
        </div>
        <div v-else-if="dailyShowRelay" class="task-planning__relay" role="status" aria-live="polite">
          <h4 class="task-planning__relay-title">일간</h4>
          <p class="task-planning__relay-sub">{{ feedbackDayLabel }} 기준</p>
          <div class="task-planning__praise-card">
            <span class="task-planning__check-badge" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="task-planning__check-svg">
                <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <p v-if="dailyCompletedCount > 0" class="task-planning__relay-meta">완료 {{ dailyCompletedCount }}건 · 미완료 없음</p>
            <p class="task-planning__feedback-praise-text">{{ dailyRelayBody }}</p>
          </div>
        </div>

        <template v-if="showWeeklyFeedbackChart">
          <FeedbackDonut
            v-if="weeklyUseDonut"
            title="주간"
            :subtitle="weekRangeLabel"
            :segments="weeklyDonutSegments"
            :selected-key="selectedFeedback?.scope === 'weekly' ? selectedFeedback.key : null"
            @segment-click="onWeeklySegmentClick"
          />
          <div v-else-if="weeklyNoSchedule" class="task-planning__feedback-slot-empty" role="status">
            <h4 class="task-planning__relay-title">주간</h4>
            <p class="task-planning__relay-sub">{{ weekRangeLabel }}</p>
            <p class="task-planning__slot-empty-text">이번 주에 배정된 일정이 없어요.</p>
          </div>
          <div v-else-if="weeklyShowRelay" class="task-planning__relay" role="status" aria-live="polite">
            <h4 class="task-planning__relay-title">주간</h4>
            <p class="task-planning__relay-sub">{{ weekRangeLabel }}</p>
            <div class="task-planning__praise-card">
              <span class="task-planning__check-badge" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="task-planning__check-svg">
                  <path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <p v-if="weeklyCompletedCount > 0" class="task-planning__relay-meta">완료 {{ weeklyCompletedCount }}건 · 미완료 없음</p>
              <p class="task-planning__feedback-praise-text">{{ weeklyRelayBody }}</p>
            </div>
          </div>
        </template>
      </div>

      <div
        v-if="dailyUseDonut || weeklyUseDonut"
        class="task-planning__feedback-detail"
        role="region"
        :aria-label="detailAriaLabel"
      >
        <template v-if="!selectedFeedback">
          <p class="task-planning__feedback-placeholder">차트에서 항목을 선택하면 여기에 목록이 표시됩니다.</p>
        </template>

        <template v-else-if="selectedFeedback.scope === 'daily'">
          <template v-if="selectedFeedback.key === 'in-progress'">
            <p class="task-planning__detail-heading">진행중 ({{ dailyFeedback.inProgressOnDay.length }}건)</p>
            <ul v-if="dailyFeedback.inProgressOnDay.length > 0" class="task-planning__feedback-list">
              <li v-for="t in dailyFeedback.inProgressOnDay" :key="t.id">
                <button type="button" class="task-planning__feedback-task" @click="emit('select', t.id)">{{ t.title }}</button>
              </li>
            </ul>
            <p v-else class="task-planning__feedback-neutral">해당 항목이 없습니다.</p>
          </template>
          <template v-else-if="selectedFeedback.key === 'overdue'">
            <p class="task-planning__detail-heading">기한초과 ({{ dailyFeedback.overdueOnDay.length }}건)</p>
            <ul v-if="dailyFeedback.overdueOnDay.length > 0" class="task-planning__feedback-list">
              <li v-for="t in dailyFeedback.overdueOnDay" :key="t.id">
                <button type="button" class="task-planning__feedback-task" @click="emit('select', t.id)">{{ t.title }}</button>
              </li>
            </ul>
            <p v-else class="task-planning__feedback-neutral">해당 항목이 없습니다.</p>
          </template>
          <template v-else-if="selectedFeedback.key === 'completed'">
            <p class="task-planning__detail-heading">완료 ({{ dailyFeedback.completedOnDay.length }}건)</p>
            <ul v-if="dailyFeedback.completedOnDay.length > 0" class="task-planning__feedback-list">
              <li v-for="t in dailyFeedback.completedOnDay" :key="t.id">
                <button type="button" class="task-planning__feedback-task" @click="emit('select', t.id)">{{ t.title }}</button>
              </li>
            </ul>
            <p v-else class="task-planning__feedback-neutral">해당 항목이 없습니다.</p>
          </template>
          <template v-else>
            <p class="task-planning__feedback-neutral">항목을 선택해 주세요.</p>
          </template>
        </template>

        <template v-else>
          <template v-if="selectedFeedback.key === 'completed'">
            <p class="task-planning__detail-heading">주간 완료 ({{ weeklyFeedback.completedInWeek.length }}건)</p>
            <ul v-if="weeklyFeedback.completedInWeek.length > 0" class="task-planning__feedback-list">
              <li v-for="t in weeklyFeedback.completedInWeek" :key="t.id">
                <button type="button" class="task-planning__feedback-task" @click="emit('select', t.id)">{{ t.title }}</button>
              </li>
            </ul>
            <p v-else class="task-planning__feedback-neutral">해당 항목이 없습니다.</p>
          </template>
          <template v-else-if="selectedFeedback.key === 'incomplete'">
            <p class="task-planning__detail-heading">주간 미완료 ({{ weeklyFeedback.incompleteInWeek.length }}건)</p>
            <ul v-if="weeklyFeedback.incompleteInWeek.length > 0" class="task-planning__feedback-list">
              <li v-for="t in weeklyFeedback.incompleteInWeek" :key="t.id">
                <button type="button" class="task-planning__feedback-task" @click="emit('select', t.id)">{{ t.title }}</button>
              </li>
            </ul>
            <p v-else class="task-planning__feedback-neutral">해당 항목이 없습니다.</p>
          </template>
          <template v-else>
            <p class="task-planning__feedback-neutral">항목을 선택해 주세요.</p>
          </template>
        </template>
        </div>
        </div>
        <!-- // .task-planning__feedback-body -->

        <!-- 월간 리포트 -->
        <MonthlyReport
          class="task-planning__monthly-wrap"
          :class="{ 'task-planning__monthly-wrap--hidden': !showMonthly }"
          :tasks="taskStore.tasks"
          @navigate-task="onMonthlyTaskNavigate"
        />
      </div>
      <!-- // .task-planning__panel-wrap -->
    </div>

    <div class="task-planning__calendar">
      <div
        class="task-planning__month-panel"
        role="region"
        aria-labelledby="task-planning-month-calendar-title"
      >
        <div class="task-planning__month-toolbar">
          <button type="button" class="task-planning__month-nav" aria-label="이전 달" @click="calendarStore.shiftCalendarMonth(-1)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-planning__month-nav-icon">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h3 id="task-planning-month-calendar-title" class="task-planning__month-title">{{ calendarMonthTitle }}</h3>
          <button type="button" class="task-planning__month-nav" aria-label="다음 달" @click="calendarStore.shiftCalendarMonth(1)">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-planning__month-nav-icon">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
          <button type="button" class="task-planning__month-today" aria-label="오늘 날짜로 이동" @click="calendarStore.goToToday()">
            today
          </button>
        </div>
        <div class="task-planning__month-weekdays" aria-hidden="true">
          <span v-for="label in monthWeekdayLabels" :key="label" class="task-planning__month-weekday-label">{{ label }}</span>
        </div>
        <div class="task-planning__month-grid">
          <button
            v-for="(mcell, idx) in monthGridCells"
            :key="mcell.dateKey + '-' + idx"
            type="button"
            class="task-planning__month-cell"
            :class="{
              'task-planning__month-cell--outside': !mcell.inMonth,
              'task-planning__month-cell--selected': selectedCalendarDay === mcell.dateKey,
            }"
            :aria-label="monthCellAriaLabel(mcell)"
            :aria-pressed="selectedCalendarDay === mcell.dateKey ? 'true' : 'false'"
            @click="calendarStore.setSelectedDayFromMonth(mcell)"
          >
            <span class="task-planning__month-cell-num">{{ mcell.dayOfMonth }}</span>
            <span class="task-planning__month-cell-dots" aria-hidden="true">
              <span v-if="getDotCountForDateKey(mcell.dateKey) >= 1" class="task-planning__week-dot" />
              <span v-if="getDotCountForDateKey(mcell.dateKey) >= 2" class="task-planning__week-dot" />
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarUiStore } from '@/stores/calendar-ui-store'
import {
  getMonthGrid,
  countTasksOnDate,
  dotCountForDay,
  parseLocalDateKey,
  getTodayLocalDateKey,
  type MonthGridCell,
} from '@/utils/task-calendar'
import {
  computeDailyFeedback,
  computeWeeklyFeedback,
  shouldShowDailyPraise,
  shouldShowWeeklyPraise,
  pickDailyPraiseMessage,
  pickDailyAllClearMessage,
  pickWeeklyPraiseMessage,
  pickWeeklyAllClearMessage,
  taskMatchesSelectedDay,
  taskOverlapsWeek,
} from '@/utils/task-feedback'
import FeedbackDonut, { type FeedbackDonutSegment } from '@/components/FeedbackDonut.vue'
import MonthlyReport from '@/components/MonthlyReport.vue'
import type { Task } from '@/types/task'

interface Emits {
  (e: 'select', taskId: string): void
}

const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const calendarStore = useCalendarUiStore()
const { selectedCalendarDay, weekRangeLabel, weekBounds, calendarView } = storeToRefs(calendarStore)

const COLOR_INPROGRESS = '#3b82f6'
const COLOR_OVERDUE    = '#ef4444'
const COLOR_COMPLETED  = '#22c55e'
const COLOR_INCOMPLETE = '#f59e0b'

interface FeedbackSelection {
  scope: 'daily' | 'weekly'
  key: string
}

const showMonthly = ref(false)
const showIntroTooltip = ref(false)
const introBtnRef = ref<HTMLButtonElement | null>(null)
const introTooltipPos = ref({ top: 0, left: 0 })

function openIntroTooltip() {
  if (introBtnRef.value) {
    const rect = introBtnRef.value.getBoundingClientRect()
    introTooltipPos.value = {
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2 + 10,
    }
  }
  showIntroTooltip.value = true
}

function closeIntroTooltip() {
  showIntroTooltip.value = false
}

const selectedFeedback = ref<FeedbackSelection | null>(null)

function shiftWeek(delta: number) {
  const d = parseLocalDateKey(feedbackDayKey.value)
  d.setDate(d.getDate() + delta * 7)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  selectedCalendarDay.value = `${y}-${m}-${day}`
  calendarStore.calendarView.year = d.getFullYear()
  calendarStore.calendarView.month = d.getMonth()
}

const feedbackDayKey = computed(() => selectedCalendarDay.value ?? getTodayLocalDateKey())

const feedbackDayLabel = computed(() => {
  const d = parseLocalDateKey(feedbackDayKey.value)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
})

const dailyFeedback = computed(() => computeDailyFeedback(taskStore.tasks, feedbackDayKey.value))

const dailyPraise = computed(() => shouldShowDailyPraise(taskStore.tasks, feedbackDayKey.value))

const weeklyFeedback = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) {
    return { completedInWeek: [] as Task[], incompleteInWeek: [] as Task[] }
  }
  return computeWeeklyFeedback(taskStore.tasks, start, end)
})

const showWeeklyFeedbackChart = computed(() => {
  const { start, end } = weekBounds.value
  return Boolean(start && end)
})

const hasDailyScheduledTasks = computed(() =>
  taskStore.tasks.some((t) => taskMatchesSelectedDay(t, feedbackDayKey.value))
)

const hasWeeklyScheduledTasks = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) return false
  return taskStore.tasks.some((t) => taskOverlapsWeek(t, start, end))
})

const dailyNoSchedule = computed(() => !hasDailyScheduledTasks.value)

const weeklyNoSchedule = computed(
  () => showWeeklyFeedbackChart.value && !hasWeeklyScheduledTasks.value
)

/** 미완료(진행중+기한초과) 가 1건 이상일 때만 도넛 표시 */
const dailyUseDonut = computed(
  () =>
    dailyFeedback.value.inProgressOnDay.length > 0 ||
    dailyFeedback.value.overdueOnDay.length > 0
)

/** 주간 미완료가 1건 이상일 때만 도넛 표시 */
const weeklyUseDonut = computed(
  () =>
    showWeeklyFeedbackChart.value &&
    hasWeeklyScheduledTasks.value &&
    weeklyFeedback.value.incompleteInWeek.length > 0
)

/** 일정 있고 미완료 없음(완료만 존재) → 칭찬 릴레이 */
const dailyShowRelay = computed(
  () => hasDailyScheduledTasks.value && !dailyUseDonut.value
)

/** 주간 일정 있고 미완료 없음(완료만 존재) → 칭찬 릴레이 */
const weeklyShowRelay = computed(
  () =>
    showWeeklyFeedbackChart.value &&
    hasWeeklyScheduledTasks.value &&
    weeklyFeedback.value.incompleteInWeek.length === 0
)

const dailyCompletedCount = computed(() => dailyFeedback.value.completedOnDay.length)

const weeklyCompletedCount = computed(() => weeklyFeedback.value.completedInWeek.length)

const dailyRelayBody = computed(() =>
  dailyPraise.value
    ? pickDailyPraiseMessage(feedbackDayKey.value)
    : pickDailyAllClearMessage(feedbackDayKey.value)
)

const weeklyRelayBody = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) return ''
  return shouldShowWeeklyPraise(taskStore.tasks, start, end)
    ? pickWeeklyPraiseMessage(start, end)
    : pickWeeklyAllClearMessage(start, end)
})

const dailyDonutSegments = computed((): FeedbackDonutSegment[] => [
  { key: 'in-progress', label: '진행중',   count: dailyFeedback.value.inProgressOnDay.length, color: COLOR_INPROGRESS },
  { key: 'overdue',     label: '기한초과', count: dailyFeedback.value.overdueOnDay.length,    color: COLOR_OVERDUE },
  { key: 'completed',   label: '완료',     count: dailyFeedback.value.completedOnDay.length,  color: COLOR_COMPLETED },
])

const weeklyDonutSegments = computed((): FeedbackDonutSegment[] => [
  { key: 'completed',  label: '완료',   count: weeklyFeedback.value.completedInWeek.length,  color: COLOR_COMPLETED },
  { key: 'incomplete', label: '미완료', count: weeklyFeedback.value.incompleteInWeek.length, color: COLOR_INCOMPLETE },
])

const detailAriaLabel = computed(() => {
  if (!selectedFeedback.value) return '피드백 상세'
  return selectedFeedback.value.scope === 'daily' ? '일간 피드백 상세' : '주간 피드백 상세'
})

function onDailySegmentClick(key: string) {
  selectedFeedback.value = { scope: 'daily', key }
}

function onWeeklySegmentClick(key: string) {
  selectedFeedback.value = { scope: 'weekly', key }
}

function firstCountedKey(segs: FeedbackDonutSegment[]): string | null {
  return segs.find((s) => s.count > 0)?.key ?? null
}

watch(
  [dailyDonutSegments, weeklyDonutSegments, dailyUseDonut, weeklyUseDonut, showWeeklyFeedbackChart],
  () => {
    const dKey = firstCountedKey(dailyDonutSegments.value)
    const wKey = firstCountedKey(weeklyDonutSegments.value)

    if (!dailyUseDonut.value && !weeklyUseDonut.value) {
      selectedFeedback.value = null
      return
    }

    if (!selectedFeedback.value) {
      if (dailyUseDonut.value && dKey) {
        selectedFeedback.value = { scope: 'daily', key: dKey }
      } else if (weeklyUseDonut.value && wKey) {
        selectedFeedback.value = { scope: 'weekly', key: wKey }
      }
      return
    }

    const { scope, key } = selectedFeedback.value
    if (scope === 'daily' && !dailyUseDonut.value) {
      selectedFeedback.value = weeklyUseDonut.value && wKey ? { scope: 'weekly', key: wKey } : null
      return
    }
    if (scope === 'weekly' && !weeklyUseDonut.value) {
      selectedFeedback.value = dailyUseDonut.value && dKey ? { scope: 'daily', key: dKey } : null
      return
    }
    const validDaily = dailyDonutSegments.value.some((s) => s.key === key)
    const validWeekly = weeklyDonutSegments.value.some((s) => s.key === key)
    if (scope === 'daily' && !validDaily) {
      selectedFeedback.value = dKey
        ? { scope: 'daily', key: dKey }
        : wKey
          ? { scope: 'weekly', key: wKey }
          : null
    } else if (scope === 'weekly' && !validWeekly) {
      selectedFeedback.value = wKey
        ? { scope: 'weekly', key: wKey }
        : dKey
          ? { scope: 'daily', key: dKey }
          : null
    }
  },
  { immediate: true }
)

const monthWeekdayLabels = ['월', '화', '수', '목', '금', '토', '일']

const monthGridCells = computed(() =>
  getMonthGrid(calendarView.value.year, calendarView.value.month)
)

const calendarMonthTitle = computed(
  () => `${calendarView.value.year}년 ${calendarView.value.month + 1}월`
)

function monthCellAriaLabel(mcell: MonthGridCell): string {
  const n = countTasksOnDate(taskStore.tasks, mcell.dateKey)
  const d = parseLocalDateKey(mcell.dateKey)
  return `${d.getMonth() + 1}월 ${d.getDate()}일, 일정 ${n}건`
}

function getDotCountForDateKey(dateKey: string): 0 | 1 | 2 {
  return dotCountForDay(countTasksOnDate(taskStore.tasks, dateKey))
}

function onMonthlyTaskNavigate(task: Task) {
  calendarStore.applyForTask(task)
  emit('select', task.id)
}
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.task-planning {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  min-height: 0;
}

.task-planning__feedback {
  padding: $spacing-md;
  border: 1px solid $color-gray-200;
  border-radius: $radius-lg;
  background: $color-white;
}

.task-planning__feedback-topbar {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  margin-bottom: $spacing-sm;
}

.task-planning__feedback-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-gray-500;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.task-planning__intro-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.task-planning__intro-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  background: transparent;
  border: none;
  color: $color-gray-400;
  cursor: pointer;
  transition: color 0.15s;

  &:hover,
  &:focus {
    color: $color-primary;
    outline: none;
  }
}

.task-planning__intro-icon {
  width: 15px;
  height: 15px;
}

.task-planning__intro-tooltip {
  // body 기준 fixed 배치로 overflow 부모 탈출
  position: fixed;
  transform: translateX(-50%) translateY(-4px);
  width: 220px;
  padding: $spacing-sm $spacing-md;
  background: $color-gray-800;
  color: $color-white;
  font-size: 0.6875rem;
  line-height: 1.5;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.18s ease;

  // 말풍선 꼬리
  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid $color-gray-800;
  }

  &--visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.task-planning__monthly-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  margin-bottom: $spacing-md;
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-primary;
  border-radius: $radius-md;
  background: rgba($color-primary-light, 0.1);
  font: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-primary-dark;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba($color-primary-light, 0.2);
  }
}

.task-planning__monthly-btn-icon {
  width: 14px;
  height: 14px;
}

// ── 슬라이드 래퍼 ──────────────────────────────
.task-planning__panel-wrap {
  overflow: hidden;
}

.task-planning__feedback-body {
  transition: transform 0.3s ease, opacity 0.3s ease, max-height 0.35s ease;
  max-height: 9999px;

  &--hidden {
    transform: translateX(-20px);
    opacity: 0;
    pointer-events: none;
    max-height: 0;
    overflow: hidden;
  }
}

.task-planning__monthly-wrap {
  transition: transform 0.3s ease, opacity 0.3s ease, max-height 0.35s ease;
  max-height: 9999px;

  &--hidden {
    transform: translateX(20px);
    opacity: 0;
    pointer-events: none;
    max-height: 0;
    overflow: hidden;
  }
}

.task-planning__week-nav {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
}

.task-planning__week-nav-label {
  flex: 1;
  min-width: 0;
  text-align: center;
  font-size: 1rem;
  font-weight: 700;
  color: $color-gray-900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-planning__week-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  color: $color-gray-700;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: $color-gray-100;
  }
}

.task-planning__week-nav-icon {
  width: 18px;
  height: 18px;
}

.task-planning__week-nav-today {
  padding: $spacing-xs $spacing-sm;
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-gray-700;
  background: $color-white;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: $color-gray-100;
  }
}

.task-planning__donuts {
  display: grid;
  grid-template-columns: 1fr;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;

  &--both {
    grid-template-columns: 1fr 1fr;
  }

  &--daily-only {
    justify-items: center;
    max-width: 220px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 360px) {
    &--both {
      grid-template-columns: 1fr;
    }
  }
}

.task-planning__relay {
  width: 100%;
  max-width: 220px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.task-planning__relay-title {
  margin: 0 0 $spacing-xs;
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-gray-800;
}

.task-planning__relay-sub {
  margin: 0 0 $spacing-sm;
  font-size: 0.6875rem;
  color: $color-gray-600;
  line-height: 1.3;
}

.task-planning__relay-meta {
  margin: 0 0 $spacing-xs;
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-success;
}

.task-planning__feedback-slot-empty {
  width: 100%;
  max-width: 220px;
  margin-left: auto;
  margin-right: auto;
  text-align: center;
}

.task-planning__slot-empty-text {
  margin: 0;
  font-size: 0.75rem;
  color: $color-gray-600;
  line-height: 1.45;
}

.task-planning__praise-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-md;
  border-radius: $radius-lg;
  background: linear-gradient(
    135deg,
    rgba($color-success, 0.08) 0%,
    rgba($color-success, 0.16) 100%
  );
  border: 1px solid rgba($color-success, 0.4);
  box-shadow: 0 0 0 4px rgba($color-success, 0.06), $shadow-sm;
  text-align: center;
  width: 100%;
}

.task-planning__check-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: $color-success;
  color: $color-white;
  flex-shrink: 0;
  box-shadow: 0 0 0 5px rgba($color-success, 0.18);
}

.task-planning__check-svg {
  width: 26px;
  height: 26px;
}

.task-planning__feedback-detail {
  padding-top: $spacing-md;
  border-top: 1px solid $color-gray-200;
  min-height: 4rem;
  font-size: 0.8125rem;
}

.task-planning__feedback-placeholder {
  margin: 0;
  font-size: 0.75rem;
  color: $color-gray-500;
}

.task-planning__detail-heading {
  margin: 0 0 $spacing-xs;
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-gray-800;
}

.task-planning__feedback-list {
  margin: 0;
  padding-left: 1.25rem;
}

.task-planning__feedback-task {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  color: #545585;
  // text-decoration: underline;
  cursor: pointer;
  text-align: left;

  &:hover {
    color: $color-primary-dark;
  }
}

.task-planning__feedback-praise-text {
  margin: 0;
  font-weight: 600;
  color: $color-gray-800;
}

.task-planning__feedback-neutral {
  margin: 0;
  font-size: 0.8125rem;
  color: $color-gray-600;
}

.task-planning__calendar {
  min-height: 0;
}

.task-planning__month-panel {
  width: 100%;
  max-height: min(70vh, 520px);
  overflow: auto;
  padding: $spacing-md;
  background: $color-white;
  border: 1px solid $color-gray-200;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

.task-planning__month-toolbar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
}

.task-planning__month-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  cursor: pointer;
  color: $color-gray-700;
  transition: background 0.2s;

  &:hover {
    background: $color-gray-100;
  }
}

.task-planning__month-nav-icon {
  width: 18px;
  height: 18px;
}

.task-planning__month-title {
  flex: 1;
  margin: 0;
  min-width: 0;
  font-size: 1rem;
  font-weight: 700;
  text-align: center;
  color: $color-gray-900;
}

.task-planning__month-today {
  padding: $spacing-xs $spacing-sm;
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-gray-700;
  background: $color-white;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: $color-gray-100;
  }
}

.task-planning__month-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: $spacing-xs;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-gray-500;
}

.task-planning__month-weekday-label {
  padding: 2px 0;
}

.task-planning__month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.task-planning__month-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 48px;
  padding: $spacing-xs;
  border: 1px solid transparent;
  border-radius: $radius-md;
  background: $color-gray-50;
  cursor: pointer;
  font: inherit;
  color: $color-gray-900;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    background: $color-gray-100;
  }

  &--outside {
    opacity: 0.45;
    background: $color-white;
  }

  &--selected {
    border-color: $color-primary;
    background: rgba($color-primary-light, 0.2);
  }
}

.task-planning__month-cell-num {
  font-size: 0.8125rem;
  font-weight: 600;
}

.task-planning__month-cell-dots {
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  min-height: 8px;
}

.task-planning__week-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: $color-primary;
}
</style>

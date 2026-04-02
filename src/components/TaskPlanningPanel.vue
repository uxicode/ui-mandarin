<template>
  <div class="task-planning">
    <div class="task-planning__feedback" aria-label="업무 피드백">
      <p class="task-planning__feedback-intro">
        마감일이 있는 업무만 집계합니다. 캘린더에서 고른 날짜·그날이 속한 주 기준으로 일간·주간을 봅니다. 배정된 일정이 없으면 안내 문구가 나오고, 미완료가 없으면 칭찬 릴레이가 나와요.
      </p>

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
        <div v-else class="task-planning__feedback-slot-empty" role="status">
          <h4 class="task-planning__relay-title">일간</h4>
          <p class="task-planning__relay-sub">{{ feedbackDayLabel }} 기준</p>
          <p class="task-planning__slot-empty-text">{{ dailySlotEmptyMessage }}</p>
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
          <div v-else class="task-planning__feedback-slot-empty" role="status">
            <h4 class="task-planning__relay-title">주간</h4>
            <p class="task-planning__relay-sub">{{ weekRangeLabel }}</p>
            <p class="task-planning__slot-empty-text">{{ weeklySlotEmptyMessage }}</p>
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
          <template v-if="selectedFeedback.key === 'incomplete'">
            <p class="task-planning__detail-heading">
              미완료 ({{ dailyFeedback.incompleteOnDay.length }}건)
            </p>
            <ul v-if="dailyFeedback.incompleteOnDay.length > 0" class="task-planning__feedback-list">
              <li v-for="t in dailyFeedback.incompleteOnDay" :key="t.id">
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
          <template v-if="selectedFeedback.key === 'incomplete'">
            <p class="task-planning__detail-heading">
              주간 미완료 ({{ weeklyFeedback.incompleteInWeek.length }}건)
            </p>
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
  pickWeeklyPraiseMessage,
  pickDailyAllClearMessage,
  pickWeeklyAllClearMessage,
  countCompletedOnSelectedDay,
  countCompletedOverlappingWeek,
  taskMatchesSelectedDay,
  taskOverlapsWeek,
} from '@/utils/task-feedback'
import FeedbackDonut, { type FeedbackDonutSegment } from '@/components/FeedbackDonut.vue'
import type { Task } from '@/types/task'

interface Emits {
  (e: 'select', taskId: string): void
}

const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const calendarStore = useCalendarUiStore()
const { selectedCalendarDay, weekRangeLabel, weekBounds, calendarView } = storeToRefs(calendarStore)

const COLOR_INCOMPLETE = '#f59e0b'

interface FeedbackSelection {
  scope: 'daily' | 'weekly'
  key: string
}

const selectedFeedback = ref<FeedbackSelection | null>(null)

const feedbackDayKey = computed(() => selectedCalendarDay.value ?? getTodayLocalDateKey())

const feedbackDayLabel = computed(() => {
  const d = parseLocalDateKey(feedbackDayKey.value)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
})

const dailyFeedback = computed(() => computeDailyFeedback(taskStore.tasks, feedbackDayKey.value))

const dailyPraise = computed(() => shouldShowDailyPraise(taskStore.tasks, feedbackDayKey.value))

const dailyPraiseMessage = computed(() => pickDailyPraiseMessage(feedbackDayKey.value))

const weeklyFeedback = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) {
    return { incompleteInWeek: [] as Task[] }
  }
  return computeWeeklyFeedback(taskStore.tasks, start, end)
})

const weeklyPraise = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) return false
  return shouldShowWeeklyPraise(taskStore.tasks, start, end)
})

const weeklyPraiseMessage = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) return ''
  return pickWeeklyPraiseMessage(start, end)
})

const dailyAllClearMessage = computed(() => pickDailyAllClearMessage(feedbackDayKey.value))

const weeklyAllClearMessage = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) return '금주 범위를 표시할 수 없어요.'
  return pickWeeklyAllClearMessage(start, end)
})

const showWeeklyFeedbackChart = computed(() => {
  const { start, end } = weekBounds.value
  return Boolean(start && end)
})

const dailyIncompleteTotal = computed(() => dailyFeedback.value.incompleteOnDay.length)

const weeklyIncompleteTotal = computed(() => weeklyFeedback.value.incompleteInWeek.length)

/** 선택일 기준 미완료가 있을 때만 (당일 마감·기한 초과·기타) */
const dailyUseDonut = computed(() => dailyIncompleteTotal.value > 0)

/** 선택일이 속한 주(weekBounds) 기준 미완료가 있을 때만 */
const weeklyUseDonut = computed(
  () => showWeeklyFeedbackChart.value && weeklyIncompleteTotal.value > 0
)

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

const dailyCompletedCount = computed(() =>
  countCompletedOnSelectedDay(taskStore.tasks, feedbackDayKey.value)
)

const weeklyCompletedCount = computed(() => {
  const { start, end } = weekBounds.value
  if (!start || !end) return 0
  return countCompletedOverlappingWeek(taskStore.tasks, start, end)
})

const dailyShowRelay = computed(
  () => hasDailyScheduledTasks.value && dailyIncompleteTotal.value === 0
)

const weeklyShowRelay = computed(
  () =>
    showWeeklyFeedbackChart.value &&
    hasWeeklyScheduledTasks.value &&
    weeklyCompletedCount.value > 0 &&
    weeklyIncompleteTotal.value === 0
)

const dailySlotEmptyMessage = computed(() => '표시할 피드백이 없어요.')

const weeklySlotEmptyMessage = computed(() => '표시할 피드백이 없어요.')

const dailyRelayBody = computed(() =>
  dailyPraise.value ? dailyPraiseMessage.value : dailyAllClearMessage.value
)

const weeklyRelayBody = computed(() =>
  weeklyPraise.value ? weeklyPraiseMessage.value : weeklyAllClearMessage.value
)

const dailyDonutSegments = computed((): FeedbackDonutSegment[] => {
  const n = dailyFeedback.value.incompleteOnDay.length
  if (n === 0) return []
  return [{ key: 'incomplete', label: '미완료', count: n, color: COLOR_INCOMPLETE }]
})

const weeklyDonutSegments = computed((): FeedbackDonutSegment[] => {
  const n = weeklyFeedback.value.incompleteInWeek.length
  if (n === 0) return []
  return [{ key: 'incomplete', label: '주간 미완료', count: n, color: COLOR_INCOMPLETE }]
})

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

watch(
  [dailyDonutSegments, weeklyDonutSegments, dailyUseDonut, weeklyUseDonut, showWeeklyFeedbackChart],
  () => {
    const dFirst = dailyDonutSegments.value.find((s) => s.count > 0) ?? dailyDonutSegments.value[0]
    const wFirst = weeklyDonutSegments.value.find((s) => s.count > 0) ?? weeklyDonutSegments.value[0]

    if (!dailyUseDonut.value && !weeklyUseDonut.value) {
      selectedFeedback.value = null
      return
    }

    if (!selectedFeedback.value) {
      if (dailyUseDonut.value && dFirst && dFirst.count > 0) {
        selectedFeedback.value = { scope: 'daily', key: dFirst.key }
      } else if (weeklyUseDonut.value && wFirst && wFirst.count > 0) {
        selectedFeedback.value = { scope: 'weekly', key: wFirst.key }
      }
      return
    }
    const { scope, key } = selectedFeedback.value
    if (scope === 'daily' && !dailyUseDonut.value) {
      selectedFeedback.value =
        weeklyUseDonut.value && wFirst && wFirst.count > 0
          ? { scope: 'weekly', key: wFirst.key }
          : null
      return
    }
    if (scope === 'weekly' && !weeklyUseDonut.value) {
      selectedFeedback.value =
        dailyUseDonut.value && dFirst && dFirst.count > 0 ? { scope: 'daily', key: dFirst.key } : null
      return
    }
    const validDaily = dailyDonutSegments.value.some((s) => s.key === key)
    const validWeekly = weeklyDonutSegments.value.some((s) => s.key === key)
    if (scope === 'daily' && !validDaily) {
      selectedFeedback.value =
        dFirst && dFirst.count > 0
          ? { scope: 'daily', key: dFirst.key }
          : wFirst && wFirst.count > 0
            ? { scope: 'weekly', key: wFirst.key }
            : null
    } else if (scope === 'weekly' && !validWeekly) {
      selectedFeedback.value =
        wFirst && wFirst.count > 0
          ? { scope: 'weekly', key: wFirst.key }
          : dFirst && dFirst.count > 0
            ? { scope: 'daily', key: dFirst.key }
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
  background: $color-gray-50;
}

.task-planning__feedback-intro {
  margin: 0 0 $spacing-md;
  font-size: 0.6875rem;
  color: $color-gray-600;
  line-height: 1.4;
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
  background: rgba($color-success, 0.1);
  border: 1px solid rgba($color-success, 0.35);
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
  color: $color-primary;
  text-decoration: underline;
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

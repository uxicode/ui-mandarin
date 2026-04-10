<template>
  <div class="annual-report">
    <!-- 연도 네비게이션 -->
    <div class="annual-report__header">
      <button type="button" class="annual-report__nav" aria-label="이전 연도" @click="prevYear">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="annual-report__nav-icon">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <h4 class="annual-report__title">{{ reportYear }}년 연간 리포트</h4>
      <button type="button" class="annual-report__nav" aria-label="다음 연도" @click="nextYear">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="annual-report__nav-icon">
          <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>

    <!-- 업무 없음 -->
    <p v-if="result.totalCount === 0" class="annual-report__empty">
      {{ reportYear }}년에 기록된 업무가 없어요.
    </p>

    <template v-else>
      <!-- 요약 통계 -->
      <div class="annual-report__summary">
        <div class="annual-report__summary-item annual-report__summary-item--total">
          <span class="annual-report__summary-num">{{ result.totalCount }}</span>
          <span class="annual-report__summary-label">전체</span>
        </div>
        <div class="annual-report__summary-item annual-report__summary-item--completed">
          <span class="annual-report__summary-num">{{ result.completedTasks.length }}</span>
          <span class="annual-report__summary-label">완료</span>
        </div>
        <div class="annual-report__summary-item annual-report__summary-item--overdue">
          <span class="annual-report__summary-num">{{ result.overdueTasks.length }}</span>
          <span class="annual-report__summary-label">기한초과</span>
        </div>
        <div class="annual-report__summary-item annual-report__summary-item--incomplete">
          <span class="annual-report__summary-num">{{ result.incompleteTasks.length }}</span>
          <span class="annual-report__summary-label">미완료</span>
        </div>
      </div>

      <!-- 월별 바 차트 -->
      <div class="annual-report__chart-wrap">
        <Bar :data="chartData" :options="chartOptions" />
      </div>

      <!-- 피드백 코멘트 -->
      <div
        class="annual-report__comment"
        :class="isImprove ? 'annual-report__comment--improve' : 'annual-report__comment--praise'"
        role="status"
      >
        <span class="annual-report__comment-icon" aria-hidden="true">{{ isImprove ? '📋' : '🎉' }}</span>
        <p class="annual-report__comment-text">{{ commentText }}</p>
      </div>

      <!-- 범례 버튼 -->
      <div class="annual-report__legend" role="group" aria-label="항목 필터">
        <button
          v-for="cat in categories"
          :key="cat.key"
          type="button"
          class="annual-report__legend-btn"
          :class="{ 'annual-report__legend-btn--active': selectedCategory === cat.key }"
          @click="toggleCategory(cat.key)"
        >
          <span class="annual-report__legend-swatch" :style="{ background: cat.color }" />
          <span>{{ cat.label }}</span>
          <span class="annual-report__legend-count">{{ cat.count }}건</span>
        </button>
      </div>

      <!-- 태스크 목록 -->
      <template v-if="selectedCategory">
        <ul v-if="activeTasks.length > 0" class="annual-report__task-list">
          <li v-for="t in activeTasks" :key="t.id">
            <button
              type="button"
              class="annual-report__task-btn"
              @click="emit('navigate-task', t)"
            >
              <span class="annual-report__task-title">{{ t.title }}</span>
              <span v-if="taskDateLabel(t)" class="annual-report__task-date">{{ taskDateLabel(t) }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="annual-report__empty">해당 항목이 없습니다.</p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import type { Task } from '@/types/task'
import { computeAnnualReport } from '@/utils/task-annual'
import { isoToLocalDateKey, parseLocalDateKey } from '@/utils/task-calendar'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface Props {
  tasks: Task[]
}

interface Emits {
  (e: 'navigate-task', task: Task): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ── 연도 네비 ──────────────────────────────────────────────
const now = new Date()
const reportYear = ref(now.getFullYear())

function prevYear() {
  reportYear.value--
  selectedCategory.value = null
}

function nextYear() {
  reportYear.value++
  selectedCategory.value = null
}

// ── 연간 집계 ─────────────────────────────────────────────
const result = computed(() => computeAnnualReport(props.tasks, reportYear.value))

// ── 피드백 코멘트 ─────────────────────────────────────────
const IMPROVE_MSGS = [
  '기한초과·미완료 비율이 절반을 넘고 있어요. 연간 업무 우선순위를 점검해 보세요.',
  '올해는 완료율이 아쉽네요. 업무 계획과 일정을 재검토해 보는 건 어떨까요?',
  '미완료 업무가 많아요. 작은 것부터 하나씩 처리해 보세요!',
] as const

const PRAISE_MSGS = [
  '완료율이 절반을 넘었어요. 올해도 좋은 흐름이에요!',
  '연간 업무를 잘 관리하고 있어요. 훌륭해요!',
  '완료 비율이 높아요. 이대로 한 해를 마무리해 봐요!',
] as const

function hashPick(key: string, length: number): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return length > 0 ? h % length : 0
}

const isImprove = computed(() => result.value.problemRate > 0.5)

const commentText = computed(() => {
  const key = `${reportYear.value}`
  if (isImprove.value) return IMPROVE_MSGS[hashPick(key, IMPROVE_MSGS.length)]!
  return PRAISE_MSGS[hashPick(key, PRAISE_MSGS.length)]!
})

// ── Chart.js 데이터 + 옵션 ────────────────────────────────
const chartData = computed(() => ({
  labels: result.value.monthlyStats.map((s) => s.label),
  datasets: [
    {
      label: '완료',
      data: result.value.monthlyStats.map((s) => s.completed),
      backgroundColor: 'rgba(34,197,94,0.75)',
      borderColor: '#22c55e',
      borderWidth: 1,
      borderRadius: 0,
    },
    {
      label: '기한초과',
      data: result.value.monthlyStats.map((s) => s.overdue),
      backgroundColor: 'rgba(239,68,68,0.75)',
      borderColor: '#ef4444',
      borderWidth: 1,
      borderRadius: 0,
    },
    {
      label: '미완료',
      data: result.value.monthlyStats.map((s) => s.incomplete),
      backgroundColor: 'rgba(245,158,11,0.75)',
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: 0,
    },
  ],
}))

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'bottom',
      labels: { boxWidth: 10, padding: 12, font: { size: 11 } },
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      padding: 10,
      callbacks: {
        title: (items) => `${items[0]?.label ?? ''}`,
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { font: { size: 10 }, maxRotation: 0 },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
    y: {
      stacked: true,
      beginAtZero: true,
      ticks: { stepSize: 1, font: { size: 10 }, precision: 0 },
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
  },
}

// ── 범례 버튼 + 태스크 목록 ────────────────────────────────
type CategoryKey = 'completed' | 'overdue' | 'incomplete'

const selectedCategory = ref<CategoryKey | null>(null)

const categories = computed(() => [
  { key: 'completed'  as CategoryKey, label: '완료',    color: '#22c55e', count: result.value.completedTasks.length },
  { key: 'overdue'    as CategoryKey, label: '기한초과', color: '#ef4444', count: result.value.overdueTasks.length },
  { key: 'incomplete' as CategoryKey, label: '미완료',  color: '#f59e0b', count: result.value.incompleteTasks.length },
])

function toggleCategory(key: CategoryKey) {
  selectedCategory.value = selectedCategory.value === key ? null : key
}

const activeTasks = computed<Task[]>(() => {
  switch (selectedCategory.value) {
    case 'completed':  return result.value.completedTasks
    case 'overdue':    return result.value.overdueTasks
    case 'incomplete': return result.value.incompleteTasks
    default:           return []
  }
})

function taskDateLabel(task: Task): string | null {
  const key = task.deadline   ? isoToLocalDateKey(task.deadline)
            : task.startDate  ? isoToLocalDateKey(task.startDate)
            : null
  if (!key) return null
  const d = parseLocalDateKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.annual-report {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

// ── 헤더 ──────────────────────────────────────
.annual-report__header {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  margin-bottom: $spacing-xs;
}

.annual-report__title {
  flex: 1;
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  text-align: center;
  color: $color-gray-900;
}

.annual-report__nav {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xs;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  cursor: pointer;
  color: $color-gray-700;
  transition: background 0.15s;

  &:hover { background: $color-gray-100; }
}

.annual-report__nav-icon {
  width: 16px;
  height: 16px;
}

// ── 요약 통계 카드 ─────────────────────────────
.annual-report__summary {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-xs;
  margin-bottom: $spacing-xs;
}

.annual-report__summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-md;
  background: $color-gray-50;
  border: 1px solid $color-gray-200;

  &--total {
    background: rgba($color-primary-light, 0.08);
    border-color: rgba($color-primary, 0.2);
  }

  &--completed {
    background: rgba(34, 197, 94, 0.08);
    border-color: rgba(34, 197, 94, 0.25);
  }

  &--overdue {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.25);
  }

  &--incomplete {
    background: rgba(245, 158, 11, 0.08);
    border-color: rgba(245, 158, 11, 0.25);
  }
}

.annual-report__summary-num {
  font-size: 1.25rem;
  font-weight: 700;
  color: $color-gray-900;
  line-height: 1;
}

.annual-report__summary-label {
  font-size: 0.6875rem;
  color: $color-gray-500;
  font-weight: 500;
}

// ── 바 차트 ────────────────────────────────────
.annual-report__chart-wrap {
  position: relative;
  height: 220px;
}

// ── 피드백 코멘트 ──────────────────────────────
.annual-report__comment {
  display: flex;
  align-items: flex-start;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: 0.75rem;
  line-height: 1.45;

  &--improve {
    background: rgba($color-warning, 0.1);
    border: 1px solid rgba($color-warning, 0.35);
    color: $color-gray-800;
  }

  &--praise {
    background: rgba($color-success, 0.1);
    border: 1px solid rgba($color-success, 0.35);
    color: $color-gray-800;
  }
}

.annual-report__comment-icon {
  font-size: 1rem;
  flex-shrink: 0;
  line-height: 1.3;
}

.annual-report__comment-text {
  margin: 0;
  font-weight: 500;
}

// ── 범례 버튼 ──────────────────────────────────
.annual-report__legend {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-xs;
}

.annual-report__legend-btn {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  font: inherit;
  font-size: 0.75rem;
  color: $color-gray-700;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;

  &:hover { background: $color-gray-100; }

  &--active {
    border-color: $color-primary;
    background: rgba($color-primary-light, 0.12);
    color: $color-primary-dark;
    font-weight: 600;
  }
}

.annual-report__legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.annual-report__legend-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.07);
  font-size: 0.6875rem;
  font-weight: 700;
  color: $color-gray-600;
  line-height: 1.4;
}

.annual-report__legend-btn--active .annual-report__legend-count {
  background: rgba($color-primary, 0.15);
  color: $color-primary-dark;
}

// ── 태스크 목록 ────────────────────────────────
.annual-report__task-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
}

.annual-report__task-btn {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $spacing-sm;
  width: 100%;
  padding: $spacing-xs $spacing-sm;
  border: none;
  border-radius: $radius-sm;
  background: $color-gray-50;
  font: inherit;
  font-size: 0.8125rem;
  color: $color-gray-800;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba($color-primary-light, 0.15);
    color: $color-primary-dark;
  }
}

.annual-report__task-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.annual-report__task-date {
  flex-shrink: 0;
  font-size: 0.6875rem;
  color: $color-gray-500;
}

.annual-report__empty {
  margin: 0;
  font-size: 0.75rem;
  color: $color-gray-500;
  text-align: center;
  padding: $spacing-md 0;
}
</style>

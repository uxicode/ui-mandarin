<template>
  <div class="task-list">
    <div class="task-list__week-wrap">
      <div class="task-list__week-toolbar">
        <button type="button" class="task-list__week-nav" aria-label="이전 주" @click="shiftWeek(-1)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__week-nav-icon">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span class="task-list__week-range">{{ weekRangeLabel }}</span>
        <button type="button" class="task-list__week-nav" aria-label="다음 주" @click="shiftWeek(1)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__week-nav-icon">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
        <div class="task-list__week-toolbar-end">
          <button type="button" class="task-list__week-today" aria-label="오늘 날짜가 포함된 주로 이동" @click="goToToday">
            today
          </button>
          <button
            type="button"
            class="task-list__week-full"
            :aria-expanded="showMonthCalendar ? 'true' : 'false'"
            @click="toggleMonthCalendar"
          >
            {{ showMonthCalendar ? '닫기' : '전체보기' }}
          </button>
        </div>
      </div>

      <div class="task-list__week" role="group" aria-label="주간 일정">
        <button
          v-for="cell in weekCells"
          :key="cell.dateKey"
          type="button"
          class="task-list__week-day"
          :class="{ 'task-list__week-day--selected': selectedCalendarDay === cell.dateKey }"
          :aria-pressed="selectedCalendarDay === cell.dateKey ? 'true' : 'false'"
          :aria-label="weekDayAriaLabel(cell)"
          @click="toggleCalendarDay(cell.dateKey)"
        >
          <span class="task-list__week-weekday">{{ cell.weekdayLabel }}</span>
          <span class="task-list__week-num">{{ cell.dayOfMonth }}</span>
          <span class="task-list__week-dots" aria-hidden="true">
            <span v-if="getDotCountForDateKey(cell.dateKey) >= 1" class="task-list__week-dot" />
            <span v-if="getDotCountForDateKey(cell.dateKey) >= 2" class="task-list__week-dot" />
          </span>
        </button>
      </div>
    </div>

    <div class="task-list__month-slide-wrap">
      <Transition name="task-list-month-slide">
        <div
          v-if="showMonthCalendar"
          class="task-list__month-panel"
          role="region"
          aria-labelledby="task-list-month-calendar-title"
        >
          <div class="task-list__month-toolbar">
            <button type="button" class="task-list__month-nav" aria-label="이전 달" @click="shiftCalendarMonth(-1)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__week-nav-icon">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <h3 id="task-list-month-calendar-title" class="task-list__month-title">{{ calendarMonthTitle }}</h3>
            <button type="button" class="task-list__month-nav" aria-label="다음 달" @click="shiftCalendarMonth(1)">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__week-nav-icon">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            <button type="button" class="task-list__month-close" @click="closeMonthCalendar">닫기</button>
          </div>
          <div class="task-list__month-weekdays" aria-hidden="true">
            <span v-for="label in monthWeekdayLabels" :key="label" class="task-list__month-weekday-label">{{ label }}</span>
          </div>
          <div class="task-list__month-grid">
            <button
              v-for="(mcell, idx) in monthGridCells"
              :key="mcell.dateKey + '-' + idx"
              type="button"
              class="task-list__month-cell"
              :class="{
                'task-list__month-cell--outside': !mcell.inMonth,
                'task-list__month-cell--selected': selectedCalendarDay === mcell.dateKey,
              }"
              :aria-label="monthCellAriaLabel(mcell)"
              :aria-pressed="selectedCalendarDay === mcell.dateKey ? 'true' : 'false'"
              @click="selectDayFromMonth(mcell)"
            >
              <span class="task-list__month-cell-num">{{ mcell.dayOfMonth }}</span>
              <span class="task-list__month-cell-dots" aria-hidden="true">
                <span v-if="getDotCountForDateKey(mcell.dateKey) >= 1" class="task-list__week-dot" />
                <span v-if="getDotCountForDateKey(mcell.dateKey) >= 2" class="task-list__week-dot" />
              </span>
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <div class="task-list__header">
      <h2 class="task-list__title">업무 목록</h2>
      <button class="task-list__add-button" @click="handleAddClick">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          class="task-list__add-icon"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        추가
      </button>
    </div>

    <!-- 새 업무 추가 폼 -->
    <TaskForm
      v-if="showAddForm"
      :is-submitting="isAddingTask"
      @submit="handleAddSubmit"
      @cancel="handleAddCancel"
    />

    <div
      v-if="displayIncompleteTasks.length === 0 && displayCompletedTasks.length === 0 && !showAddForm"
      class="task-list__empty"
    >
      <p v-if="selectedCalendarDay">선택한 날짜에 해당하는 업무가 없습니다.</p>
      <p v-else>업무가 없습니다. 새 업무를 추가해보세요.</p>
    </div>

    <!-- 미완료 업무 목록 -->
    <div v-if="displayIncompleteTasks.length > 0" class="task-list__section">
      <h3 class="task-list__section-title">진행 중 ({{ displayIncompleteTasks.length }})</h3>
      <div class="task-list__items">
        <div
          v-for="(task, index) in displayIncompleteTasks"
          :key="task.id"
          class="task-item"
          :class="{ 
            'task-item--selected': selectedTaskId === task.id,
            'task-item--editing': editingTaskId === task.id
          }"
        >
          <!-- 일반 보기 모드 -->
          <div v-if="editingTaskId !== task.id" class="task-item__view">
            <div class="task-item__checkbox-wrapper">
              <input
                type="checkbox"
                :checked="task.completed"
                @change="handleToggleComplete(task.id)"
                @click.stop
                class="task-item__checkbox"
              />
            </div>
            <div class="task-item__content" @click="handleTaskClick(task.id)">
              <h3 class="task-item__title" :class="{ 'task-item__title--completed': task.completed }">
                {{ task.title }}
              </h3>
              <div
                v-if="task.description"
                :ref="index === 0 ? setDescriptionWrapRef : undefined"
                class="task-item__description-wrap"
              >
                <button
                  v-if="isDescriptionLong(task.description)"
                  type="button"
                  class="task-item__description-toggle"
                  :title="expandedDescriptionIds.has(task.id) ? '접기' : '펼치기'"
                  @click.stop="toggleDescriptionExpand(task.id)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-item__description-arrow"
                    :class="{ 'task-item__description-arrow--expanded': expandedDescriptionIds.has(task.id) }"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <p
                  class="task-item__description"
                  :class="{ 'task-item__description--collapsed': isDescriptionLong(task.description) && !expandedDescriptionIds.has(task.id) }"
                >
                  {{ getDisplayDescription(task.description, task.id) }}
                </p>
              </div>
              <div class="task-item__dates">
                <div v-if="task.startDate" class="task-item__date-info" :class="{ 'task-item__date-info--not-started': !hasStarted(task.startDate) }">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-item__date-icon"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span>{{ formatStartDate(task.startDate) }}</span>
                  <span class="task-item__date-status">{{ getStartStatus(task.startDate) }}</span>
                </div>
                <div v-if="task.deadline" class="task-item__date-info task-item__date-info--deadline" :class="{ 'task-item__date-info--overdue': isOverdue(task.deadline) }">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-item__date-icon"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>{{ formatDeadline(task.deadline) }}</span>
                  <span class="task-item__date-status">{{ getTimeRemaining(task.deadline) }}</span>
                </div>
                <div v-if="task.startDate && task.deadline" class="task-item__duration">
                  <span>기간: {{ getTaskDuration(task.startDate, task.deadline) }}</span>
                </div>
              </div>
              <div class="task-item__scores">
                <span class="task-item__score">
                  중요도: {{ computedScores(task).importanceScore }}
                </span>
                <span class="task-item__score">
                  시급성: {{ computedScores(task).urgencyScore }}
                </span>
                <span class="task-item__quadrant">사분면: {{ getQuadrant(task) }}</span>
              </div>
            </div>
            <div class="task-item__actions">
              <button
                class="task-item__button task-item__button--edit"
                @click.stop="handleEditClick(task.id)"
                title="수정"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="task-item__icon"
                >
                  <path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                  />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                class="task-item__button task-item__button--delete"
                @click.stop="handleDeleteClick(task.id)"
                title="삭제"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="task-item__icon"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>

          <!-- 편집 모드 -->
          <div v-else class="task-item__edit">
            <form @submit.prevent="handleEditSubmit(task.id)" class="task-item__form">
              <div class="task-item__field">
                <label class="task-item__label">제목 *</label>
                <input
                  v-model="editFormData.title"
                  type="text"
                  class="task-item__input"
                  placeholder="업무 제목을 입력하세요"
                  required
                />
              </div>

              <div class="task-item__field">
                <label class="task-item__label">설명</label>
                <textarea
                  v-model="editFormData.description"
                  class="task-item__textarea"
                  placeholder="업무 설명을 입력하세요 (선택사항)"
                  rows="2"
                />
              </div>

              <div class="task-item__field">
                <label class="task-item__label">시작일시</label>
                <VueDatePicker
                  v-model="editFormData.startDate"
                  :enable-time-picker="true"
                  :format="'yyyy년 MM월 dd일 HH:mm'"
                  placeholder="시작일시를 선택하세요"
                  auto-apply
                  :clearable="true"
                />
              </div>

              <div class="task-item__field">
                <label class="task-item__label">마감일시</label>
                <VueDatePicker
                  v-model="editFormData.deadline"
                  :enable-time-picker="true"
                  :format="'yyyy년 MM월 dd일 HH:mm'"
                  placeholder="마감일시를 선택하세요"
                  auto-apply
                  :clearable="true"
                />
              </div>

              <div class="task-item__scores-edit">
                <h4 class="task-item__scores-title">점수 입력</h4>
                <StarRating
                  v-model:value="editFormData.scores.importance"
                  label="중요도"
                />
                <StarRating
                  v-model:value="editFormData.scores.urgency"
                  label="시급성"
                />
              </div>

              <div class="task-item__form-actions">
                <button 
                  type="button" 
                  class="task-item__form-button task-item__form-button--cancel"
                  @click="handleEditCancel"
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  class="task-item__form-button task-item__form-button--submit"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>

    <!-- 완료된 업무 목록 -->
    <div v-if="displayCompletedTasks.length > 0" class="task-list__section task-list__section--completed">
      <h3 class="task-list__section-title">완료 ({{ displayCompletedTasks.length }})</h3>
      <div class="task-list__items">
        <div
          v-for="task in displayCompletedTasks"
          :key="task.id"
          class="task-item task-item--completed"
          :class="{ 'task-item--selected': selectedTaskId === task.id }"
        >
          <div class="task-item__view">
            <div class="task-item__checkbox-wrapper">
              <input
                type="checkbox"
                :checked="task.completed"
                @change="handleToggleComplete(task.id)"
                @click.stop
                class="task-item__checkbox"
              />
            </div>
            <div class="task-item__content" @click="handleTaskClick(task.id)">
              <h3 class="task-item__title task-item__title--completed">
                {{ task.title }}
              </h3>
              <div v-if="task.description" class="task-item__description-wrap">
                <button
                  v-if="isDescriptionLong(task.description)"
                  type="button"
                  class="task-item__description-toggle"
                  :title="expandedDescriptionIds.has(task.id) ? '접기' : '펼치기'"
                  @click.stop="toggleDescriptionExpand(task.id)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-item__description-arrow"
                    :class="{ 'task-item__description-arrow--expanded': expandedDescriptionIds.has(task.id) }"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                <p
                  class="task-item__description"
                  :class="{ 'task-item__description--collapsed': isDescriptionLong(task.description) && !expandedDescriptionIds.has(task.id) }"
                >
                  {{ getDisplayDescription(task.description, task.id) }}
                </p>
              </div>
              <div class="task-item__dates">
                <div v-if="task.startDate" class="task-item__date-info" :class="{ 'task-item__date-info--not-started': !hasStarted(task.startDate) }">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-item__date-icon"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                  <span>{{ formatStartDate(task.startDate) }}</span>
                  <span class="task-item__date-status">{{ getStartStatus(task.startDate) }}</span>
                </div>
                <div v-if="task.deadline" class="task-item__date-info task-item__date-info--deadline" :class="{ 'task-item__date-info--overdue': isOverdue(task.deadline) }">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-item__date-icon"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>{{ formatDeadline(task.deadline) }}</span>
                  <span class="task-item__date-status text-white">{{ getTimeRemaining(task.deadline) }}</span>
                </div>
                <div v-if="task.startDate && task.deadline" class="task-item__duration">
                  <span>기간: {{ getTaskDuration(task.startDate, task.deadline) }}</span>
                </div>
              </div>
              <div class="task-item__scores">
                <span class="task-item__score">
                  중요도: {{ computedScores(task).importanceScore }}
                </span>
                <span class="task-item__score">
                  시급성: {{ computedScores(task).urgencyScore }}
                </span>
                <span class="task-item__quadrant">사분면: {{ getQuadrant(task) }}</span>
              </div>
            </div>
            <div class="task-item__actions">
              <button
                class="task-item__button task-item__button--delete"
                @click.stop="handleDeleteClick(task.id)"
                title="삭제"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  class="task-item__icon"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import { calculateScores, getQuadrant as getQuadrantFromScores } from '@/utils/score-calculator'
import { formatDeadline, isOverdue, getTimeRemaining, formatStartDate, hasStarted, getStartStatus, getTaskDuration } from '@/utils/date-formatter'
import {
  getWeekDaysMonSun,
  getMonthGrid,
  countTasksOnDate,
  dotCountForDay,
  taskHasDateOnCalendar,
  parseLocalDateKey,
  getTodayLocalDateKey,
  type WeekDayCell,
  type MonthGridCell,
} from '@/utils/task-calendar'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import StarRating from './StarRating.vue'
import TaskForm from './TaskForm.vue'
import type { Task, TaskScores } from '@/types/task'

interface Props {
  selectedTaskId?: string
}

interface Emits {
  (e: 'select', taskId: string): void
  (e: 'delete', taskId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()

const selectedCalendarDay = ref<string | null>(getTodayLocalDateKey())

/** 주간 스트립이 표시할 주(그 안의 아무 날짜) */
const weekAnchor = ref(new Date())

const weekCells = computed(() => getWeekDaysMonSun(weekAnchor.value))

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

function shiftWeek(delta: number) {
  const d = new Date(weekAnchor.value)
  d.setDate(d.getDate() + delta * 7)
  weekAnchor.value = d
}

function goToToday() {
  const now = new Date()
  weekAnchor.value = now
  selectedCalendarDay.value = getTodayLocalDateKey()
  calendarView.value = { year: now.getFullYear(), month: now.getMonth() }
}

const showMonthCalendar = ref(false)
const calendarView = ref({ year: new Date().getFullYear(), month: new Date().getMonth() })

const monthWeekdayLabels = ['월', '화', '수', '목', '금', '토', '일']

const monthGridCells = computed(() =>
  getMonthGrid(calendarView.value.year, calendarView.value.month)
)

const calendarMonthTitle = computed(
  () => `${calendarView.value.year}년 ${calendarView.value.month + 1}월`
)

function toggleMonthCalendar() {
  if (showMonthCalendar.value) {
    closeMonthCalendar()
    return
  }
  const n = new Date()
  calendarView.value = { year: n.getFullYear(), month: n.getMonth() }
  showMonthCalendar.value = true
}

function closeMonthCalendar() {
  showMonthCalendar.value = false
}

function shiftCalendarMonth(delta: number) {
  const d = new Date(calendarView.value.year, calendarView.value.month + delta, 1)
  calendarView.value = { year: d.getFullYear(), month: d.getMonth() }
}

function selectDayFromMonth(mcell: MonthGridCell) {
  selectedCalendarDay.value = mcell.dateKey
  weekAnchor.value = parseLocalDateKey(mcell.dateKey)
}

function monthCellAriaLabel(mcell: MonthGridCell): string {
  const n = countTasksOnDate(taskStore.tasks, mcell.dateKey)
  const d = parseLocalDateKey(mcell.dateKey)
  return `${d.getMonth() + 1}월 ${d.getDate()}일, 일정 ${n}건`
}

function onKeydownEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && showMonthCalendar.value) closeMonthCalendar()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydownEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydownEscape)
})

function taskMatchesDayFilter(task: Task): boolean {
  if (!selectedCalendarDay.value) return true
  return taskHasDateOnCalendar(task, selectedCalendarDay.value)
}

const displayIncompleteTasks = computed(() => taskStore.incompleteTasks.filter(taskMatchesDayFilter))

const displayCompletedTasks = computed(() => taskStore.completedTasks.filter(taskMatchesDayFilter))

function toggleCalendarDay(dateKey: string) {
  if (selectedCalendarDay.value === dateKey) {
    selectedCalendarDay.value = null
  } else {
    selectedCalendarDay.value = dateKey
  }
}

function getDotCountForDateKey(dateKey: string): 0 | 1 | 2 {
  return dotCountForDay(countTasksOnDate(taskStore.tasks, dateKey))
}

function weekDayAriaLabel(cell: WeekDayCell): string {
  const n = countTasksOnDate(taskStore.tasks, cell.dateKey)
  return `${cell.weekdayLabel}요일 ${cell.dayOfMonth}일, 일정 ${n}건`
}

// 새 업무 추가 폼 표시 여부
const showAddForm = ref(false)
const isAddingTask = ref(false)

// 편집 중인 업무 ID
const editingTaskId = ref<string | undefined>()

// 편집 폼 데이터
const editFormData = ref<{
  title: string
  description?: string
  startDate?: Date | null
  deadline?: Date | null
  scores: TaskScores
}>({
  title: '',
  description: '',
  startDate: null,
  deadline: null,
  scores: {
    importance: 3,
    urgency: 3,
  },
})

// 공백 포함 50자 제한. 줄바꿈은 1자로 세지 않고, 한 줄 글자 수 = width / (fontSize/8) 로 계산
const DESCRIPTION_MAX_LENGTH = 50
const expandedDescriptionIds = ref<Set<string>>(new Set())
const charsPerLine = ref(40)
const descriptionWrapRef = ref<HTMLElement | null>(null)

function measureCharsPerLine() {
  const el = descriptionWrapRef.value
  if (!el) return
  const width = el.offsetWidth
  const descEl = el.querySelector('.task-item__description')
  const style = descEl ? getComputedStyle(descEl) : getComputedStyle(el)
  const fontSize = parseFloat(style.fontSize) || 14
  const value = Math.floor((width * 8) / fontSize)
  charsPerLine.value = Math.max(1, value)
}

function getEffectiveLength(text: string): number {
  const perLine = charsPerLine.value
  let len = 0
  for (const c of text) {
    if (c === '\n' || c === '\r') len += perLine
    else len += 1
  }
  return len
}

function isDescriptionLong(description: string | undefined): boolean {
  return !!description && getEffectiveLength(description) > DESCRIPTION_MAX_LENGTH
}

function getDisplayDescription(description: string, taskId: string): string {
  if (!description) return ''
  if (!isDescriptionLong(description)) return description
  if (expandedDescriptionIds.value.has(taskId)) return description
  const perLine = charsPerLine.value
  let effective = 0
  let i = 0
  for (; i < description.length; i++) {
    const c = description[i]
    const add = c === '\n' || c === '\r' ? perLine : 1
    if (effective + add > DESCRIPTION_MAX_LENGTH) break
    effective += add
  }
  return description.slice(0, i) + '...'
}

function toggleDescriptionExpand(taskId: string) {
  const next = new Set(expandedDescriptionIds.value)
  if (next.has(taskId)) {
    next.delete(taskId)
  } else {
    next.add(taskId)
  }
  expandedDescriptionIds.value = next
}

function setDescriptionWrapRef(el: unknown) {
  descriptionWrapRef.value = el as HTMLElement | null
}

watch(descriptionWrapRef, (el) => {
  if (el) nextTick(measureCharsPerLine)
}, { flush: 'post' })

onMounted(() => {
  nextTick(measureCharsPerLine)
})

// 중요도와 시급성을 계산
function computedScores(task: Task) {
  return calculateScores(task.scores)
}

// 사분면을 계산
function getQuadrant(task: Task) {
  const scores = computedScores(task)
  return getQuadrantFromScores(scores)
}

// 새 업무 추가 버튼 클릭
function handleAddClick() {
  showAddForm.value = true
}

// 새 업무 추가 제출
async function handleAddSubmit(task: Omit<Task, 'id'>) {
  isAddingTask.value = true
  try {
    await taskStore.addTask({
      title: task.title,
      description: task.description,
      scores: task.scores,
      startDate: task.startDate,
      deadline: task.deadline,
    })
    showAddForm.value = false
  } catch (error) {
    console.error('업무 추가 실패:', error)
  } finally {
    isAddingTask.value = false
  }
}

// 새 업무 추가 취소
function handleAddCancel() {
  showAddForm.value = false
}

// 업무 선택
function handleTaskClick(taskId: string) {
  emit('select', taskId)
}

// 업무 수정 모드 진입
function handleEditClick(taskId: string) {
  const task = taskStore.getTaskById(taskId)
  if (task) {
    editingTaskId.value = taskId
    editFormData.value = {
      title: task.title,
      description: task.description || '',
      startDate: task.startDate ? new Date(task.startDate) : null,
      deadline: task.deadline ? new Date(task.deadline) : null,
      scores: { ...task.scores },
    }
  }
}

// 업무 수정 제출
async function handleEditSubmit(taskId: string) {
  try {
    await taskStore.updateTask(taskId, {
      title: editFormData.value.title,
      description: editFormData.value.description || undefined,
      startDate: editFormData.value.startDate ? editFormData.value.startDate.toISOString() : undefined,
      deadline: editFormData.value.deadline ? editFormData.value.deadline.toISOString() : undefined,
      scores: editFormData.value.scores,
    })
    editingTaskId.value = undefined
  } catch (error) {
    console.error('업무 수정 실패:', error)
  }
}

// 업무 수정 취소
function handleEditCancel() {
  editingTaskId.value = undefined
}

// 업무 완료 토글
async function handleToggleComplete(taskId: string) {
  try {
    await taskStore.toggleTaskComplete(taskId)
  } catch (error) {
    console.error('업무 완료 상태 변경 실패:', error)
  }
}

// 업무 삭제
function handleDeleteClick(taskId: string) {
  if (confirm('정말 삭제하시겠습니까?')) {
    emit('delete', taskId)
  }
}
</script>

<style lang="scss" scoped>
.task-list {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.task-list__week-wrap {
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-md;
  border-bottom: 1px solid $color-gray-200;
}

.task-list__week-toolbar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
  flex-wrap: wrap;
}

.task-list__week-nav {
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

.task-list__week-nav-icon {
  width: 18px;
  height: 18px;
}

.task-list__week-range {
  flex: 1;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-gray-700;
  text-align: center;
}

.task-list__week-toolbar-end {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  flex-shrink: 0;
}

.task-list__week-today {
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

.task-list__week-full {
  padding: $spacing-xs $spacing-sm;
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-primary;
  background: transparent;
  border: 1px solid $color-primary;
  border-radius: $radius-md;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: rgba($color-primary-light, 0.12);
  }
}

.task-list__month-slide-wrap {
  overflow: hidden;
}

.task-list-month-slide-enter-active,
.task-list-month-slide-leave-active {
  transition:
    transform 0.28s ease,
    opacity 0.28s ease;
}

.task-list-month-slide-enter-from,
.task-list-month-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.task-list__month-panel {
  width: 100%;
  max-height: min(70vh, 520px);
  overflow: auto;
  margin-bottom: $spacing-lg;
  padding: $spacing-lg;
  background: $color-white;
  border: 1px solid $color-gray-200;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

.task-list__month-toolbar {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
}

.task-list__month-nav {
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

.task-list__month-title {
  flex: 1;
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  text-align: center;
  color: $color-gray-900;
}

.task-list__month-close {
  padding: $spacing-xs $spacing-sm;
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-gray-600;
  background: $color-gray-100;
  border: none;
  border-radius: $radius-md;
  cursor: pointer;

  &:hover {
    background: $color-gray-200;
  }
}

.task-list__month-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: $spacing-xs;
  text-align: center;
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-gray-500;
}

.task-list__month-weekday-label {
  padding: 2px 0;
}

.task-list__month-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.task-list__month-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-height: 52px;
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

.task-list__month-cell-num {
  font-size: 0.875rem;
  font-weight: 600;
}

.task-list__month-cell-dots {
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  min-height: 8px;
}

.task-list__week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: $spacing-xs;
}

.task-list__week-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: $spacing-xs $spacing-xs;
  border: 1px solid transparent;
  border-radius: $radius-md;
  background: $color-gray-50;
  cursor: pointer;
  font: inherit;
  color: $color-gray-800;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    background: $color-gray-100;
  }

  &--selected {
    border-color: $color-primary;
    background: rgba($color-primary-light, 0.2);
  }
}

.task-list__week-weekday {
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-gray-500;
}

.task-list__week-num {
  font-size: 0.875rem;
  font-weight: 700;
}

.task-list__week-dots {
  display: flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  min-height: 8px;
}

.task-list__week-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: $color-primary;
}

.task-list__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-lg;
}

.task-list__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: $color-gray-900;
}

.task-list__add-button {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-md;
  background: $color-primary;
  color: $color-white;
  border-radius: $radius-md;
  font-size: 0.875rem;
  font-weight: 600;
  transition: background 0.2s;

  &:hover {
    background: $color-primary-dark;
  }
}

.task-list__add-icon {
  width: 20px;
  height: 20px;
}

.task-list__empty {
  @include flex-center;
  flex: 1;
  color: $color-gray-500;
  font-size: 0.875rem;
}

.task-list__section {
  margin-bottom: $spacing-xl;
  min-height: 310px;
  overflow-y: auto;

  &--completed {
    margin-top: $spacing-xl;
    padding-top: $spacing-xl;
    border-top: 2px solid $color-gray-200;
  }
}

.task-list__section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-700;
  margin-bottom: $spacing-md;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.task-list__items {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.task-item {
  @include card;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  min-width: 0;
  // overflow: hidden;

  &--selected {
    border-color: $color-primary;
    background: $color-gray-50;
  }

  &--editing {
    border-color: $color-primary;
    box-shadow: $shadow-lg;
  }

  .task-item__view{
    display: flex;
    gap: $spacing-md;
    align-items: flex-start;
    min-width: 0;
  }

  &--completed {
    opacity: 0.7;
    background: $color-gray-50;
    padding: $spacing-xs $spacing-md;

    .task-item__view{
      align-items: center;
    }
    
    .task-item__description-wrap, .task-item__dates, .task-item__scores {
      display: none;
    }
  }
}

.task-item__checkbox {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: $color-primary;

  &:hover {
    transform: scale(1.1);
  }
}

.task-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateX(2px);
  }
}

.task-item__title {
  font-size: 1rem;
  font-weight: 600;
  color: $color-gray-900;
  transition: all 0.2s;
  word-break: break-word;
  overflow-wrap: break-word;

  &--completed {
    text-decoration: line-through;
    color: $color-gray-500;
    font-size: 0.75rem;
  }
}

.task-item__description-wrap {
  position: relative;
  min-width: 0;
}

.task-item__description-toggle {
  position: absolute;
  top: 0;
  right: 0;
  padding: $spacing-xs;
  background: transparent;
  border: none;
  border-radius: $radius-sm;
  cursor: pointer;
  color: $color-gray-500;
  transition: color 0.2s, background 0.2s;

  &:hover {
    color: $color-primary;
    background: $color-gray-100;
  }
}

.task-item__description-arrow {
  width: 16px;
  height: 16px;
  display: block;
  transition: transform 0.2s;

  &--expanded {
    transform: rotate(180deg);
  }
}

.task-item__description {
  font-size: 0.875rem;
  color: $color-gray-600;
  line-height: 1.5;
  word-break: break-word;
  overflow-wrap: break-word;
  white-space: pre-wrap;
  padding-right: 28px;
}

.task-item__dates {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  min-width: 0;
}

.task-item__date-info {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: 0.75rem;
  color: $color-gray-600;
  padding: $spacing-xs $spacing-sm;
  background: $color-gray-100;
  border-radius: $radius-sm;
  width: fit-content;

  &--deadline {
    background: $color-primary-light;
    color: #fff;
  }

  &--not-started {
    background: rgba($color-warning, 0.1);
    color: $color-warning;
  }

  &--overdue {
    color: $color-danger;
    background: rgba($color-danger, 0.1);
    font-weight: 600;
  }
}

.task-item__date-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.task-item__date-status {
  margin-left: $spacing-xs;
  font-weight: 600;
  color: $color-primary;

  &.text-white {
    color: #fff;
  }

  .task-item__date-info--overdue & {
    color: $color-danger;
  }

  .task-item__date-info--not-started & {
    color: $color-warning;
  }
}

.task-item__duration {
  font-size: 0.7rem;
  color: $color-gray-500;
  padding: $spacing-xs $spacing-sm;
  background: $color-gray-50;
  border-radius: $radius-sm;
  width: fit-content;
  font-weight: 600;
}

.task-item__deadline {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  font-size: 0.75rem;
  color: $color-gray-600;
  padding: $spacing-xs $spacing-sm;
  background: $color-gray-100;
  border-radius: $radius-sm;
  width: fit-content;

  &--overdue {
    color: $color-danger;
    background: rgba($color-danger, 0.1);
    font-weight: 600;
  }
}

.task-item__deadline-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.task-item__deadline-remaining {
  margin-left: $spacing-xs;
  font-weight: 600;
  color: $color-primary;

  .task-item__deadline--overdue & {
    color: $color-danger;
  }
}

.task-item__scores {
  display: flex;
  gap: $spacing-md;
  flex-wrap: wrap;
  min-width: 0;
}

.task-item__score {
  font-size: 0.75rem;
  color: $color-gray-600;
  padding: $spacing-xs $spacing-sm;
  background: $color-gray-100;
  border-radius: $radius-sm;
}

.task-item__quadrant {
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-primary;
  padding: $spacing-xs $spacing-sm;
  background: rgba($color-primary-light, 0.1);
  border-radius: $radius-sm;
}

.task-item__actions {
  display: flex;
  gap: $spacing-xs;
  align-items: flex-start;
}

.task-item__button {
  padding: $spacing-xs;
  border-radius: $radius-sm;
  transition: background 0.2s;

  &--edit:hover {
    background: $color-gray-200;
  }

  &--delete:hover {
    background: $color-danger;
    color: $color-white;
  }
}

.task-item__icon {
  width: 18px;
  height: 18px;
}

// 편집 모드 스타일
.task-item__edit {
  width: 100%;
}

.task-item__form {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
}

.task-item__field {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.task-item__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-gray-700;
}

.task-item__input,
.task-item__textarea {
  padding: $spacing-sm $spacing-md;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 0.875rem;
  color: $color-gray-900;
  background: $color-white;
  transition: border-color 0.2s;

  &:focus {
    border-color: $color-primary;
    outline: none;
  }

  &::placeholder {
    color: $color-gray-400;
  }
}

.task-item__textarea {
  resize: vertical;
  min-height: 60px;
}

.task-item__scores-edit {
  padding: $spacing-md;
  background: $color-gray-50;
  border-radius: $radius-md;
}

.task-item__scores-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-900;
  margin-bottom: $spacing-sm;
}

.task-item__form-actions {
  display: flex;
  gap: $spacing-sm;
  justify-content: flex-end;
}

.task-item__form-button {
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;

  &--cancel {
    color: $color-gray-700;
    background: $color-gray-200;

    &:hover {
      background: $color-gray-300;
    }
  }

  &--submit {
    color: $color-white;
    background: $color-primary;

    &:hover {
      background: $color-primary-dark;
    }
  }
}

// Vue Datepicker 커스터마이징
:deep(.dp__input) {
  padding: $spacing-sm $spacing-xl;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 0.875rem;
  color: $color-gray-900;
  background: $color-white;

  &:focus {
    border-color: $color-primary;
  }

  &::placeholder {
    color: $color-gray-400;
  }
}

:deep(.dp__main) {
  font-family: inherit;
}

:deep(.dp__theme_light) {
  --dp-primary-color: #{$color-primary};
  --dp-primary-text-color: #{$color-white};
  --dp-hover-color: #{$color-gray-100};
  --dp-border-color: #{$color-gray-300};
}
</style>


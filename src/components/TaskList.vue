<template>
  <div class="task-list">
    <div class="task-list__header">
      <h2 class="task-list__title">업무 목록</h2>
      <div class="task-list__header-actions">
        <button
          type="button"
          class="task-list__export-btn"
          :class="{ 'task-list__export-btn--active': showExport }"
          :disabled="props.showTimeline"
          @click="showExport = !showExport"
        >
          <svg v-if="showExport" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__export-btn-icon">
            <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          {{ showExport ? '돌아가기' : '완료 리스트 복사' }}
        </button>
        <button
          type="button"
          class="task-list__timeline-btn"
          :class="{ 'task-list__timeline-btn--active': props.showTimeline }"
          @click="emit('toggle-timeline')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__timeline-btn-icon">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          {{ props.showTimeline ? '목록 보기' : '타임라인' }}
        </button>
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
    </div>

    <!-- 새 업무 추가 폼 -->
    <!-- 타임라인 뷰 -->
    <TaskTimeline
      v-if="props.showTimeline"
      :selected-task-id="props.selectedTaskId"
      @select="emit('select', $event)"
    />

    <template v-if="!props.showTimeline">

    <Transition name="task-form-slide">
      <TaskForm
        v-if="showAddForm"
        :is-submitting="isAddingTask"
        @submit="handleAddSubmit"
        @cancel="handleAddCancel"
      />
    </Transition>

    <!-- 슬라이드 래퍼: 기존 목록 (grid-template-rows 트릭으로 높이 부드럽게) -->
    <div class="task-list__main-outer" :class="{ 'task-list__main-outer--collapsed': showExport }">
    <div class="task-list__main">

    <!-- 초기 목록 로딩 skeleton -->
    <div v-if="taskStore.isLoading && taskStore.tasks.length === 0" class="task-list__skeleton" aria-busy="true" aria-label="업무 목록 불러오는 중">
      <div v-for="n in 4" :key="n" class="task-list__skeleton-item">
        <span class="task-list__skeleton-check" />
        <span class="task-list__skeleton-line" />
      </div>
    </div>

    <div
      v-if="!taskStore.isLoading && taskStore.tasks.length > 0 && displayIncompleteTasks.length === 0 && !showAddForm"
      class="task-list__empty"
    >
      <p>할당된 업무 목록이 없습니다.</p>
    </div>

    <!-- 미완료 업무 목록 -->
    <div v-if="displayIncompleteTasks.length > 0" class="task-list__section">
      <h3 class="task-list__section-title">진행 중 ({{ displayIncompleteTasks.length }})</h3>
      <div class="task-list__items">
        <div
          v-for="(task, index) in displayIncompleteTasks"
          :key="task.id"
          class="task-item"
          :data-task-item-id="task.id"
          :class="{ 
            'task-item--selected': selectedTaskId === task.id,
            'task-item--editing': editingTaskId === task.id,
            'task-item--overdue': !task.completed && task.deadline && isOverdue(task.deadline)
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
                  중요도: {{ task.scores.importance }}
                </span>
                <span class="task-item__score">
                  시급성: {{ task.scores.urgency }}
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
          :data-task-item-id="task.id"
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
                  중요도: {{ task.scores.importance }}
                </span>
                <span class="task-item__score">
                  시급성: {{ task.scores.urgency }}
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

    </div><!-- /task-list__main -->
    </div><!-- /task-list__main-outer -->

    <!-- 완료 텍스트 카드 -->
    <div class="task-list__export-outer" :class="{ 'task-list__export-outer--collapsed': !showExport }">
    <div class="task-list__export-card">
      <div class="task-list__export-header">
        <span class="task-list__export-title">
          완료 목록 ({{ displayCompletedTasks.length }}건)
        </span>
        <button
          type="button"
          class="task-list__export-copy"
          :class="{ 'task-list__export-copy--done': copyDone }"
          :disabled="displayCompletedTasks.length === 0"
          :title="copyDone ? '복사됨' : '클립보드에 복사'"
          @click="copyExportText"
        >
          <svg v-if="!copyDone" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__export-copy-icon">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-list__export-copy-icon">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
      </div>
      <ol v-if="displayCompletedTasks.length > 0" class="task-list__export-list">
        <li v-for="t in displayCompletedTasks" :key="t.id">{{ t.title }}</li>
      </ol>
      <p v-else class="task-list__export-empty">완료된 업무가 없습니다.</p>
    </div><!-- /task-list__export-card -->
    </div><!-- /task-list__export-outer -->

    </template><!-- /v-if="!props.showTimeline" -->

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarUiStore } from '@/stores/calendar-ui-store'
import { calculateScores, getQuadrant as getQuadrantFromScores } from '@/utils/score-calculator'
import { formatDeadline, isOverdue, getTimeRemaining, formatStartDate, hasStarted, getStartStatus, getTaskDuration } from '@/utils/date-formatter'
import {
  taskHasDateOnCalendar,
  getTaskSpanDateKeys,
  resolveTaskCalendarDateKey,
} from '@/utils/task-calendar'
import { VueDatePicker } from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import StarRating from './StarRating.vue'
import TaskForm from './TaskForm.vue'
import TaskTimeline from './TaskTimeline.vue'
import type { Task, TaskScores } from '@/types/task'

interface Props {
  selectedTaskId?: string
  showTimeline?: boolean
}

interface Emits {
  (e: 'select', taskId: string): void
  (e: 'delete', taskId: string): void
  (e: 'toggle-timeline'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const calendarStore = useCalendarUiStore()
const { selectedCalendarDay } = storeToRefs(calendarStore)

function scrollTaskItemIntoView(taskId: string) {
  nextTick(() => {
    nextTick(() => {
      const root = document.querySelector('.task-list')
      if (!root) return
      const el = root.querySelector(`[data-task-item-id="${taskId}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  })
}

watch(
  () => props.selectedTaskId,
  (taskId) => {
    if (!taskId) return
    const task = taskStore.tasks.find((t) => t.id === taskId)
    if (!task) return
    calendarStore.applyForTask(task)
    scrollTaskItemIntoView(taskId)
  }
)

function taskMatchesDayFilter(task: Task): boolean {
  if (!selectedCalendarDay.value) return true
  const day = selectedCalendarDay.value
  if (taskHasDateOnCalendar(task, day)) return true
  /** 일정 없음: 생성일(등) 앵커 날짜가 선택일과 같을 때만 목록에 표시 */
  if (getTaskSpanDateKeys(task).length === 0) {
    return resolveTaskCalendarDateKey(task) === day
  }
  return false
}

const displayIncompleteTasks = computed(() => taskStore.incompleteTasks.filter(taskMatchesDayFilter))

const displayCompletedTasks = computed(() => taskStore.completedTasks.filter(taskMatchesDayFilter))

// 완료 리스트 텍스트 내보내기
const showExport = ref(false)
const copyDone = ref(false)

const exportText = computed(() =>
  displayCompletedTasks.value.map((t, i) => `${i + 1}. ${t.title}`).join('\n')
)

async function copyExportText() {
  await navigator.clipboard.writeText(exportText.value)
  copyDone.value = true
  setTimeout(() => (copyDone.value = false), 1800)
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
  min-height: 0;
  display: flex;
  flex-direction: column;
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

.task-list__header-actions {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.task-list__timeline-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: $spacing-sm $spacing-md;
  background: transparent;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 0.8125rem;
  font-weight: 500;
  color: $color-gray-600;
  transition: background 0.2s, border-color 0.2s, color 0.2s;

  &:hover {
    background: $color-gray-50;
    border-color: $color-gray-400;
  }

  &--active {
    background: rgba($color-primary, 0.08);
    border-color: $color-primary;
    color: $color-primary-dark;
    font-weight: 600;
  }

  &-icon {
    width: 15px;
    height: 15px;
  }
}

.task-list__export-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: $spacing-sm $spacing-md;
  background: $color-white;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 0.8125rem;
  font-weight: 500;
  color: $color-gray-600;
  transition: background 0.2s, border-color 0.2s, color 0.2s;

  &:hover {
    background: $color-gray-50;
    border-color: $color-gray-400;
  }

  &--active {
    background: $color-gray-100;
    border-color: $color-gray-400;
    color: $color-gray-800;
  }

  &-icon {
    width: 16px;
    height: 16px;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// TaskForm 슬라이드 인/아웃 트랜지션
.task-form-slide-enter-active,
.task-form-slide-leave-active {
  overflow: hidden;
  transition: max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.25s ease,
              transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.task-form-slide-enter-from {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.task-form-slide-enter-to {
  max-height: 600px;
  opacity: 1;
  transform: translateY(0);
}

.task-form-slide-leave-from {
  max-height: 600px;
  opacity: 1;
  transform: translateY(0);
}

.task-form-slide-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

// grid-template-rows 트릭: 높이를 0fr ↔ 1fr 로 자연스럽게 애니메이션
// 내부 콘텐츠에 overflow:hidden 이 있어야 clipping 됨
.task-list__main-outer,
.task-list__export-outer {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);

  > * {
    overflow: hidden;
    min-height: 0;
    // 내부 콘텐츠 opacity + 미세 이동
    transition:
      opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &--collapsed {
    grid-template-rows: 0fr;

    > * {
      opacity: 0;
    }
  }
}

.task-list__main {
  max-height: 840px;
  overflow-y: auto;
}
// 방향감: 기존 목록은 위로, 카드는 아래에서
.task-list__main-outer--collapsed > * {
  transform: translateY(-10px);
}
.task-list__export-outer > * {
  transform: translateY(0);
}
.task-list__export-outer--collapsed > * {
  transform: translateY(10px);
}

.task-list__export-card {
  border: 1px solid $color-gray-200;
  border-radius: $radius-lg;
  background: $color-white;
  padding: $spacing-md;
}

.task-list__export-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $spacing-sm;
}

.task-list__export-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-800;
}

.task-list__export-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: $radius-md;
  background: transparent;
  color: $color-gray-500;
  transition: background 0.15s, color 0.15s;

  &:hover:not(:disabled) {
    background: $color-gray-100;
    color: $color-gray-800;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &--done {
    color: $color-success;
  }

  &-icon {
    width: 16px;
    height: 16px;
  }
}

.task-list__export-list {
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.875rem;
  line-height: 1.8;
  color: $color-gray-700;
}

.task-list__export-empty {
  font-size: 0.875rem;
  color: $color-gray-400;
  text-align: center;
  padding: $spacing-md 0;
}

.task-list__empty {
  @include flex-center;
  // flex: 1;
  min-height: 110px;
  color: $color-gray-500;
  font-size: 0.875rem;
}

.task-list__skeleton {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  padding: $spacing-xs 0;
}

.task-list__skeleton-item {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: $spacing-sm $spacing-xs;
}

.task-list__skeleton-check {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border-radius: $radius-sm;
  background: $color-gray-200;
  animation: skeleton-pulse 1.4s ease-in-out infinite;
}

.task-list__skeleton-line {
  flex: 1;
  height: 14px;
  border-radius: $radius-sm;
  background: $color-gray-200;
  animation: skeleton-pulse 1.4s ease-in-out infinite;

  &:nth-child(odd) {
    max-width: 75%;
  }
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}

.task-list__section {
  margin-bottom: $spacing-xl;
  min-height: 310px;
  max-height: 840px;
  // overflow-y: auto;

  &--completed {
    margin-top: $spacing-xl;
    padding-top: $spacing-xl;
    border-top: none;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(to right, transparent, $color-gray-300 30%, $color-gray-300 70%, transparent);
    }
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
 // border: 3px solid transparent;
 border-radius: 0;
  // 좌측 상태 컬러 바
  border-left: 3px solid $color-primary;
  transition: all 0.3s ease;
  min-width: 0;
  border-radius: 4px;

  &--selected {
    // border-color: $color-primary;
    border: 3px solid #63f196;;
    background: $color-white;
  }

  &--editing {
    border-color: $color-primary;
    box-shadow: $shadow-lg;
  }

  &--overdue {
    border-left-color: $color-danger;
    background: rgba($color-danger, 0.02);
  }

  .task-item__view{
    display: flex;
    gap: $spacing-md;
    align-items: flex-start;
    min-width: 0;
  }

  &--completed {
    background: $color-white;
    padding: $spacing-xs $spacing-md;
    border-left-color: $color-success;

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


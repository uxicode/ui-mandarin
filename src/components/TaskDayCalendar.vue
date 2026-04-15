<template>
  <div class="task-day-cal">
    <div class="task-day-cal__nav">
      <button type="button" class="task-day-cal__nav-btn" @click="goPrevDay">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-day-cal__nav-icon">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        이전
      </button>
      <span class="task-day-cal__nav-label">{{ dayLabel }}</span>
      <button type="button" class="task-day-cal__nav-btn" @click="goNextDay">
        다음
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="task-day-cal__nav-icon">
          <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button type="button" class="task-day-cal__today" @click="goToday">오늘</button>
    </div>

    <p class="task-day-cal__hint">빈 시간대를 클릭하면 1시간 길이의 바가 생깁니다. 바를 드래그해 시간대를 옮기고, 하단 가장자리에서 10분 단위로 길이를 조절할 수 있습니다. 이동이나 길이 조절을 드래그한 뒤 놓으면(드롭) 새 업무 팝업이 열립니다. 드래그 없이 바를 더블클릭해도 팝업을 열 수 있습니다.</p>

    <div v-if="anchorTasks.length > 0" class="task-day-cal__anchors">
      <span class="task-day-cal__anchors-label">시간 없음</span>
      <button
        v-for="t in anchorTasks"
        :key="t.id"
        type="button"
        class="task-day-cal__anchor-chip"
        :class="{ 'task-day-cal__anchor-chip--selected': props.selectedTaskId === t.id }"
        @click="openEditModal(t)"
      >
        {{ t.title }}
      </button>
    </div>

    <div class="task-day-cal__scroll">
      <div class="task-day-cal__body">
        <div class="task-day-cal__times" :style="{ height: gridContentHeight + 'px' }">
          <div
            v-for="h in hourLabels"
            :key="h.key"
            class="task-day-cal__time-label"
            :style="{ top: h.top + 'px' }"
          >
            {{ h.text }}
          </div>
        </div>
        <div
          ref="gridRef"
          class="task-day-cal__grid"
          :style="{ height: gridContentHeight + 'px' }"
          role="grid"
          :aria-label="dayLabel"
          @pointerdown="onGridPointerDown"
          @pointermove="onGridPointerMove"
          @pointerup="onGridPointerUp"
          @pointercancel="onGridPointerCancel"
        >
          <div
            v-for="i in slotCount"
            :key="i"
            class="task-day-cal__slot"
            :style="{ height: rowHeight + 'px' }"
          />
          <div
            v-show="hasDraft"
            ref="draftBarRef"
            class="task-day-cal__draft"
            :style="draftBarStyle"
            @pointermove="onDraftPointerMove"
            @pointerup="onDraftPointerUp"
            @pointercancel="onDraftPointerCancel"
          >
            <div
              class="task-day-cal__draft-main"
              @pointerdown.stop="onDraftMovePointerDown"
              @dblclick.stop="openCreateFromDraft"
            >
              <span class="task-day-cal__draft-title">{{ defaultNewTitle }}</span>
              <span class="task-day-cal__draft-time">{{ draftTimeRangeLabel }}</span>
            </div>
            <div
              class="task-day-cal__draft-resize"
              aria-label="종료 시각 조절, 10분 단위"
              @pointerdown.stop="onDraftResizePointerDown"
            />
          </div>
          <button
            v-for="task in timedTasks"
            :key="task.id"
            type="button"
            class="task-day-cal__block"
            :class="{ 'task-day-cal__block--selected': props.selectedTaskId === task.id }"
            :style="blockStyle(task)"
            @click.stop="openEditModal(task)"
          >
            <span class="task-day-cal__block-title">{{ task.title }}</span>
            <span class="task-day-cal__block-meta">중{{ task.scores.importance }} · 시{{ task.scores.urgency }}</span>
          </button>
        </div>
      </div>
    </div>

    <QuickTaskModal
      :open="modalOpen"
      :mode="modalMode"
      :slot-label="modalSlotLabel"
      :initial-title="modalInitialTitle"
      :initial-scores="modalInitialScores"
      :anchor-rect="modalAnchorRect"
      :is-submitting="isModalSubmitting"
      @close="onQuickModalClose"
      @submit="onModalSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarUiStore } from '@/stores/calendar-ui-store'
import QuickTaskModal from './QuickTaskModal.vue'
import type { PanelAnchor } from './QuickTaskModal.vue'
import {
  DEFAULT_SLOT_MINUTES,
  layoutTaskBlockForDay,
  layoutFromMinuteRange,
  localDayMinutesToIso,
  snapMinutesToSlot,
  taskShowsOnDayGrid,
  formatTimeLabel,
  formatTimeRangeLabel,
  formatDayNavLabel,
  shiftDateKey,
  minutesFromDayStartFromY,
} from '@/utils/day-calendar'
import { getTodayLocalDateKey } from '@/utils/task-calendar'
import type { Task, TaskScores } from '@/types/task'

const defaultNewTitle = '\uc0c8 \uc5c5\ubb34'

interface Props {
  selectedTaskId?: string
}

interface Emits {
  (e: 'select', taskId: string): void
  /** 새 업무 생성 모달을 취소했을 때 부모에서 타임라인을 끄고 목록 화면으로 전환 */
  (e: 'exit-timeline'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const calendarStore = useCalendarUiStore()
const { selectedCalendarDay } = storeToRefs(calendarStore)

const rowHeight = 24
const slotCount = (24 * 60) / DEFAULT_SLOT_MINUTES
const totalMinutes = 24 * 60
const gridContentHeight = slotCount * rowHeight

const DRAFT_SNAP_MINUTES = 10
const DEFAULT_DRAFT_DURATION_MIN = 60
/** Resize: min duration = half of default 1h block (30m). */
const MIN_DRAFT_RESIZE_DURATION_MIN = DEFAULT_DRAFT_DURATION_MIN / 2
const MIN_DRAFT_DURATION_MIN = 10

const dayKey = computed(() => selectedCalendarDay.value ?? getTodayLocalDateKey())
const dayLabel = computed(() => formatDayNavLabel(dayKey.value))

const hourLabels = computed(() => {
  const out: { key: string; top: number; text: string }[] = []
  for (let h = 0; h < 24; h++) {
    const top = (h * 60 / totalMinutes) * gridContentHeight
    out.push({
      key: `h-${h}`,
      top,
      text: `${String(h).padStart(2, '0')}:00`,
    })
  }
  return out
})

const timedTasks = computed(() =>
  taskStore.tasks.filter(
    (t) => taskShowsOnDayGrid(t, dayKey.value) && !!(t.startDate || t.deadline)
  )
)

const anchorTasks = computed(() =>
  taskStore.tasks.filter(
    (t) => taskShowsOnDayGrid(t, dayKey.value) && !t.startDate && !t.deadline
  )
)

const gridRef = ref<HTMLElement | null>(null)
const draftBarRef = ref<HTMLElement | null>(null)

const hasDraft = ref(false)
const draftStartMin = ref(0)
const draftEndMin = ref(60)

const gridPointerId = ref<number | null>(null)
const gridPointerStartY = ref(0)
const gridPointerDidMove = ref(false)

interface DraftMoveInteraction {
  kind: 'move'
  pointerId: number
  startClientY: number
  origStart: number
  origEnd: number
  moved: boolean
}

interface DraftResizeInteraction {
  kind: 'resize'
  pointerId: number
  startClientY: number
  origEnd: number
  moved: boolean
}

const draftInteraction = ref<DraftMoveInteraction | DraftResizeInteraction | null>(null)

const draftBarStyle = computed(() => {
  const layout = layoutFromMinuteRange(
    draftStartMin.value,
    draftEndMin.value,
    gridContentHeight,
    totalMinutes,
    MIN_DRAFT_DURATION_MIN
  )
  return {
    top: `${layout.topPx}px`,
    height: `${layout.heightPx}px`,
  }
})

const draftTimeRangeLabel = computed(() => {
  const a = localDayMinutesToIso(dayKey.value, draftStartMin.value)
  const b = localDayMinutesToIso(dayKey.value, draftEndMin.value)
  return formatTimeRangeLabel(a, b)
})

function minuteFromClientY(clientY: number): number {
  const grid = gridRef.value
  if (!grid) return 0
  const scrollEl = grid.closest('.task-day-cal__scroll')
  const scrollTop = scrollEl instanceof HTMLElement ? scrollEl.scrollTop : 0
  const rect = grid.getBoundingClientRect()
  const y = clientY - rect.top + scrollTop
  return minutesFromDayStartFromY(y, gridContentHeight, totalMinutes)
}

function yToDraftSnappedMinute(clientY: number): number {
  const rawMin = minuteFromClientY(clientY)
  return snapMinutesToSlot(rawMin, DRAFT_SNAP_MINUTES)
}

function blockStyle(task: Task) {
  const layout = layoutTaskBlockForDay(task, dayKey.value, gridContentHeight, totalMinutes)
  if (!layout) return { display: 'none' }
  return {
    top: `${layout.topPx}px`,
    height: `${layout.heightPx}px`,
  }
}

function goPrevDay() {
  calendarStore.setSelectedDayKey(shiftDateKey(dayKey.value, -1))
}

function goNextDay() {
  calendarStore.setSelectedDayKey(shiftDateKey(dayKey.value, 1))
}

function goToday() {
  calendarStore.goToToday()
}

const modalOpen = ref(false)
const modalMode = ref<'create' | 'edit'>('create')
const modalSlotLabel = ref('')
const pendingStartIso = ref<string | null>(null)
const pendingEndIso = ref<string | null>(null)
const modalAnchorRect = ref<PanelAnchor | null>(null)
const editingTaskId = ref<string | null>(null)
const modalInitialTitle = ref('')
const modalInitialScores = ref<TaskScores | undefined>(undefined)
const isModalSubmitting = ref(false)

function closeModal() {
  modalOpen.value = false
  pendingStartIso.value = null
  pendingEndIso.value = null
  modalAnchorRect.value = null
  editingTaskId.value = null
}

function onQuickModalClose() {
  const wasCreate = modalMode.value === 'create'
  closeModal()
  if (wasCreate) emit('exit-timeline')
}

function openCreateFromDraft() {
  const startIso = localDayMinutesToIso(dayKey.value, draftStartMin.value)
  const endIso = localDayMinutesToIso(dayKey.value, draftEndMin.value)
  pendingStartIso.value = startIso
  pendingEndIso.value = endIso
  modalMode.value = 'create'
  modalSlotLabel.value = formatTimeRangeLabel(startIso, endIso)
  modalInitialTitle.value = defaultNewTitle
  modalInitialScores.value = { importance: 3, urgency: 3 }
  editingTaskId.value = null
  modalAnchorRect.value = null
  modalOpen.value = true
}

function openEditModal(task: Task) {
  emit('select', task.id)
  modalMode.value = 'edit'
  modalAnchorRect.value = null
  editingTaskId.value = task.id
  modalInitialTitle.value = task.title
  modalInitialScores.value = { ...task.scores }
  const s = task.startDate
  const d = task.deadline
  if (s && d) {
    modalSlotLabel.value = formatTimeRangeLabel(s, d)
  } else if (s) {
    modalSlotLabel.value = formatTimeLabel(s)
  } else if (d) {
    modalSlotLabel.value = formatTimeLabel(d)
  } else {
    modalSlotLabel.value = ''
  }
  pendingStartIso.value = null
  pendingEndIso.value = null
  modalOpen.value = true
}

function placeOrMoveDraftAtMinute(m: number) {
  if (!hasDraft.value) {
    hasDraft.value = true
    draftStartMin.value = m
    draftEndMin.value = Math.min(m + DEFAULT_DRAFT_DURATION_MIN, totalMinutes)
    return
  }
  const dur = draftEndMin.value - draftStartMin.value
  let s = m
  let en = s + dur
  if (en > totalMinutes) {
    en = totalMinutes
    s = Math.max(0, en - dur)
    s = snapMinutesToSlot(s, DRAFT_SNAP_MINUTES)
    en = Math.min(totalMinutes, s + dur)
  }
  draftStartMin.value = s
  draftEndMin.value = en
}

function onGridPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const t = e.target as HTMLElement
  if (t.closest('.task-day-cal__block')) return
  if (t.closest('.task-day-cal__draft')) return
  const grid = gridRef.value
  if (!grid) return
  gridPointerDidMove.value = false
  gridPointerStartY.value = e.clientY
  gridPointerId.value = e.pointerId
  grid.setPointerCapture(e.pointerId)
}

function onGridPointerMove(e: PointerEvent) {
  if (gridPointerId.value !== e.pointerId) return
  if (Math.abs(e.clientY - gridPointerStartY.value) > 4) gridPointerDidMove.value = true
}

function onGridPointerUp(e: PointerEvent) {
  const grid = gridRef.value
  if (gridPointerId.value !== e.pointerId) return
  if (grid?.hasPointerCapture(e.pointerId)) grid.releasePointerCapture(e.pointerId)
  gridPointerId.value = null
  if (gridPointerDidMove.value) return
  const m = yToDraftSnappedMinute(e.clientY)
  placeOrMoveDraftAtMinute(m)
}

function onGridPointerCancel(e: PointerEvent) {
  const grid = gridRef.value
  if (gridPointerId.value !== e.pointerId) return
  if (grid?.hasPointerCapture(e.pointerId)) grid.releasePointerCapture(e.pointerId)
  gridPointerId.value = null
}

function onDraftMovePointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const el = draftBarRef.value
  if (!el) return
  draftInteraction.value = {
    kind: 'move',
    pointerId: e.pointerId,
    startClientY: e.clientY,
    origStart: draftStartMin.value,
    origEnd: draftEndMin.value,
    moved: false,
  }
  el.setPointerCapture(e.pointerId)
}

function onDraftResizePointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const el = draftBarRef.value
  if (!el) return
  draftInteraction.value = {
    kind: 'resize',
    pointerId: e.pointerId,
    startClientY: e.clientY,
    origEnd: draftEndMin.value,
    moved: false,
  }
  el.setPointerCapture(e.pointerId)
}

function onDraftPointerMove(e: PointerEvent) {
  const st = draftInteraction.value
  if (!st || st.pointerId !== e.pointerId) return
  if (st.kind === 'move') {
    if (Math.abs(e.clientY - st.startClientY) > 4) st.moved = true
    const dur = st.origEnd - st.origStart
    const deltaMin = ((e.clientY - st.startClientY) / gridContentHeight) * totalMinutes
    let rawS = st.origStart + deltaMin
    rawS = Math.min(Math.max(rawS, 0), totalMinutes - dur)
    const s = snapMinutesToSlot(rawS, DRAFT_SNAP_MINUTES)
    let en = s + dur
    if (en > totalMinutes) {
      en = totalMinutes
      const adjS = Math.max(0, snapMinutesToSlot(en - dur, DRAFT_SNAP_MINUTES))
      draftStartMin.value = adjS
      draftEndMin.value = Math.min(totalMinutes, adjS + dur)
    } else {
      draftStartMin.value = s
      draftEndMin.value = en
    }
    return
  }
  if (Math.abs(e.clientY - st.startClientY) > 4) st.moved = true
  const rawEnd = minuteFromClientY(e.clientY)
  let newEnd = snapMinutesToSlot(rawEnd, DRAFT_SNAP_MINUTES)
  newEnd = Math.max(draftStartMin.value + MIN_DRAFT_RESIZE_DURATION_MIN, newEnd)
  newEnd = Math.min(totalMinutes, newEnd)
  draftEndMin.value = newEnd
}

function onDraftPointerUp(e: PointerEvent) {
  const st = draftInteraction.value
  if (!st || st.pointerId !== e.pointerId) return
  const el = draftBarRef.value
  if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  draftInteraction.value = null
  const shouldOpenAfterDrop =
    (st.kind === 'move' && st.moved) ||
    (st.kind === 'resize' && (st.moved || draftEndMin.value !== st.origEnd))
  if (shouldOpenAfterDrop) openCreateFromDraft()
}

function onDraftPointerCancel(e: PointerEvent) {
  const st = draftInteraction.value
  if (!st || st.pointerId !== e.pointerId) return
  const el = draftBarRef.value
  if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  draftInteraction.value = null
}

async function onModalSubmit(payload: { title: string; scores: TaskScores }) {
  isModalSubmitting.value = true
  try {
    if (modalMode.value === 'create' && pendingStartIso.value && pendingEndIso.value) {
      await taskStore.addTask({
        title: payload.title,
        scores: payload.scores,
        startDate: pendingStartIso.value,
        deadline: pendingEndIso.value,
      })
      hasDraft.value = false
    } else if (modalMode.value === 'edit' && editingTaskId.value) {
      await taskStore.updateTask(editingTaskId.value, {
        title: payload.title,
        scores: payload.scores,
      })
    }
    closeModal()
  } finally {
    isModalSubmitting.value = false
  }
}
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

.task-day-cal {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  min-height: 0;
  flex: 1;
}

.task-day-cal__nav {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  flex-wrap: wrap;
}

.task-day-cal__nav-btn {
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

  &:hover {
    background: $color-gray-50;
    border-color: $color-gray-400;
  }
}

.task-day-cal__nav-icon {
  width: 14px;
  height: 14px;
}

.task-day-cal__nav-label {
  flex: 1;
  text-align: center;
  font-size: 0.875rem;
  font-weight: 700;
  color: $color-gray-800;
}

.task-day-cal__today {
  padding: $spacing-xs $spacing-sm;
  border-radius: $radius-md;
  border: 1px solid $color-primary;
  background: rgba($color-primary, 0.08);
  color: $color-primary-dark;
  font-size: 0.8125rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba($color-primary, 0.14);
  }
}

.task-day-cal__hint {
  margin: 0;
  font-size: 0.75rem;
  color: $color-gray-500;
}

.task-day-cal__anchors {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-xs;
}

.task-day-cal__anchors-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-gray-500;
  margin-right: $spacing-xs;
}

.task-day-cal__anchor-chip {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid $color-gray-300;
  background: $color-gray-50;
  font-size: 0.75rem;
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    border-color: $color-primary;
  }

  &--selected {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba($color-primary, 0.2);
  }
}

.task-day-cal__scroll {
  flex: 1;
  min-height: 280px;
  max-height: min(70vh, 640px);
  overflow: auto;
  border: 1px solid $color-gray-200;
  border-radius: $radius-md;
  background: $color-white;
}

.task-day-cal__body {
  display: flex;
  position: relative;
}

.task-day-cal__times {
  flex-shrink: 0;
  width: 52px;
  position: relative;
  border-right: 1px solid $color-gray-200;
  background: $color-gray-50;
}

.task-day-cal__time-label {
  position: absolute;
  left: 4px;
  right: 4px;
  font-size: 0.6875rem;
  color: $color-gray-500;
  transform: translateY(-50%);
  line-height: 1;
}

.task-day-cal__grid {
  flex: 1;
  position: relative;
  min-width: 0;
  touch-action: none;
}

.task-day-cal__draft {
  position: absolute;
  left: 4px;
  right: 8px;
  z-index: 3;
  padding: 0;
  border-radius: $radius-sm;
  background: rgba($color-primary, 0.35);
  border: 2px dotted $color-primary;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0;
  justify-content: flex-start;
  overflow: hidden;
  pointer-events: auto;
  touch-action: none;
}

.task-day-cal__draft-main {
  flex: 1;
  min-height: 0;
  padding: 6px 8px;
  cursor: grab;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: flex-start;

  &:active {
    cursor: grabbing;
  }
}

.task-day-cal__draft-resize {
  flex-shrink: 0;
  height: 8px;
  cursor: ns-resize;
  background: rgba($color-primary, 0.2);
  border-top: 1px dotted rgba($color-primary, 0.55);

  &:hover {
    background: rgba($color-primary, 0.32);
  }
}

.task-day-cal__draft-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: $color-gray-900;
  line-height: 1.2;
}

.task-day-cal__draft-time {
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-primary-dark;
  font-variant-numeric: tabular-nums;
}

.task-day-cal__slot {
  box-sizing: border-box;
  border-bottom: 1px solid $color-gray-100;
  pointer-events: none;
}

.task-day-cal__block {
  position: absolute;
  left: 4px;
  right: 8px;
  padding: 4px 8px;
  border-radius: $radius-sm;
  border: none;
  text-align: left;
  cursor: pointer;
  background: rgba($color-primary, 0.12);
  border-left: 3px solid $color-primary;
  overflow: hidden;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 2px;

  &:hover {
    background: rgba($color-primary, 0.2);
  }

  &--selected {
    box-shadow: 0 0 0 2px rgba($color-primary, 0.35);
  }
}

.task-day-cal__block-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-gray-800;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.task-day-cal__block-meta {
  font-size: 0.625rem;
  color: $color-gray-500;
}
</style>

<template>
  <div class="task-day-cal">
    <div class="task-day-cal__nav">
      <button type="button" class="task-day-cal__nav-btn" @click="goPrevDay">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          class="task-day-cal__nav-icon">
          <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        이전
      </button>
      <div class="task-day-cal__nav-title-wrap">
        <span class="task-day-cal__nav-label">{{ dayLabel }}</span>
        <div class="task-day-cal__hint-wrap">
          <button
            ref="hintBtnRef"
            type="button"
            class="task-day-cal__hint-btn"
            aria-label="일간 캘린더 안내"
            @mouseenter="openHintTooltip"
            @mouseleave="closeHintTooltip"
            @focus="openHintTooltip"
            @blur="closeHintTooltip"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              class="task-day-cal__hint-icon">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" stroke-linecap="round" />
            </svg>
          </button>
          <Teleport to="body">
            <div
              class="task-day-cal__hint-tooltip"
              :class="{ 'task-day-cal__hint-tooltip--visible': showHintTooltip }"
              :style="{ top: hintTooltipPos.top + 'px', left: hintTooltipPos.left + 'px' }"
              role="tooltip"
            >
              {{ calendarHintText }}
            </div>
          </Teleport>
        </div>
      </div>
      <button type="button" class="task-day-cal__nav-btn" @click="goNextDay">
        다음
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          class="task-day-cal__nav-icon">
          <path d="M9 18l6-6-6-6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
      <button type="button" class="task-day-cal__today" @click="goToday">오늘</button>
    </div>

    <div v-if="anchorTasks.length > 0" class="task-day-cal__anchors">
      <span class="task-day-cal__anchors-label">시간 없음</span>
      <button v-for="t in anchorTasks" :key="t.id" type="button" class="task-day-cal__anchor-chip"
        :class="{ 'task-day-cal__anchor-chip--selected': props.selectedTaskId === t.id }" @click="openEditModal(t)">
        {{ t.title }}
      </button>
    </div>

    <div ref="scrollAreaRef" class="task-day-cal__scroll">
      <div class="task-day-cal__body">
        <div class="task-day-cal__times" :style="{ height: gridContentHeight + 'px' }">
          <div v-for="h in hourLabels" :key="h.key" class="task-day-cal__time-label" :style="{ top: h.top + 'px' }">
            {{ h.text }}
          </div>
        </div>
        <div ref="gridRef" class="task-day-cal__grid" :style="{ height: gridContentHeight + 'px' }" role="grid"
          :aria-label="dayLabel" @pointerdown="onGridPointerDown" @pointermove="onGridPointerMove"
          @pointerup="onGridPointerUp" @pointercancel="onGridPointerCancel">
          <div v-for="i in slotCount" :key="i" class="task-day-cal__slot" :style="{ height: rowHeight + 'px' }" />
          <div v-show="hasDraft" ref="draftBarRef" class="task-day-cal__draft"
            :class="{ 'task-day-cal__draft--compact': isDraftCompactRow }" :style="draftBarStyle"
            @pointermove="onDraftPointerMove" @pointerup="onDraftPointerUp" @pointercancel="onDraftPointerCancel">
            <div class="task-day-cal__draft-main" @pointerdown.stop="onDraftMovePointerDown"
              @click.stop="openCreateFromDraft">
              <span class="task-day-cal__draft-title">{{ defaultNewTitle }}</span>
              <span class="task-day-cal__draft-time">{{ draftTimeRangeLabel }}</span>
            </div>
            <div class="task-day-cal__draft-resize" aria-label="종료 시각 조절, 10분 단위(최소 30분)"
              @pointerdown.stop="onDraftResizePointerDown" />
          </div>
          <div
            v-for="task in timedTasks"
            :key="task.id"
            class="task-day-cal__block"
            role="group"
            :aria-label="task.title"
            tabindex="-1"
            :class="{
              'task-day-cal__block--selected': props.selectedTaskId === task.id,
              'task-day-cal__block--dragging': blockDragPreview?.taskId === task.id && blockDragState !== null,
              'task-day-cal__block--settling': blockDragPreview?.taskId === task.id && blockDragState === null,
              'task-day-cal__block--compact': isBlockCompactRow(task),
              'task-day-cal__block--completed': task.completed,
            }"
            :style="blockStyle(task)"
            @pointermove="onBlockPointerMove"
            @pointerup="onBlockPointerUp"
            @pointercancel="onBlockPointerCancel"
          >
            <div
              class="task-day-cal__block-main"
              :class="{ 'task-day-cal__block-main--draggable': blockCanTimeDrag(task) }"
              @pointerdown.stop="onBlockMovePointerDown(task, $event)"
            >
              <div class="task-day-cal__block-inner">
                <div class="task-day-cal__block-head">
                  <input
                    type="checkbox"
                    class="task-day-cal__block-check"
                    :checked="task.completed"
                    :aria-label="`${task.title}, 업무 완료`"
                    tabindex="0"
                    @pointerdown.stop
                    @click.prevent="void onBlockToggleComplete(task)"
                  />
                  <span class="task-day-cal__block-title">{{ task.title }}</span>
                </div>
                <span v-if="blockTimeLabel(task)" class="task-day-cal__block-time">{{ blockTimeLabel(task) }}</span>
                <span v-if="!isBlockCompactRow(task)" class="task-day-cal__block-meta">중{{ task.scores.importance }} · 시{{ task.scores.urgency }}</span>
              </div>
              <div class="task-day-cal__block-actions">
                <button
                  type="button"
                  class="task-day-cal__block-edit"
                  aria-label="업무 수정"
                  title="수정"
                  tabindex="0"
                  @pointerdown.stop
                  @click.stop="onBlockEditClick(task)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-day-cal__block-action-svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  class="task-day-cal__block-delete"
                  aria-label="업무 삭제"
                  title="삭제"
                  tabindex="0"
                  @pointerdown.stop
                  @click.stop="onBlockDeleteClick(task)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    class="task-day-cal__block-action-svg"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
            <div
              v-if="blockCanTimeDrag(task)"
              class="task-day-cal__block-resize"
              aria-label="종료 시각 조절, 10분 단위(최소 30분)"
              @pointerdown.stop="onBlockResizePointerDown(task, $event)"
            />
          </div>
        </div>
      </div>
    </div>

    <QuickTaskModal :open="modalOpen" :mode="modalMode" :slot-label="modalSlotLabel" :initial-title="modalInitialTitle"
      :initial-scores="modalInitialScores" :anchor-rect="modalAnchorRect" :content-visible="quickModalContentVisible"
      :is-submitting="isModalSubmitting" @close="onQuickModalClose" @submit="onModalSubmit" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
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
  getTaskMinutesIfFullyOnLocalDay,
  snapMinutesToSlot,
  taskShowsOnDayGrid,
  formatTimeLabel,
  formatTimeRangeLabel,
  formatDayNavLabel,
  shiftDateKey,
  minutesFromDayStartFromY,
  visibleTaskDurationMinutesOnDay,
} from '@/utils/day-calendar'
import { getTodayLocalDateKey } from '@/utils/task-calendar'
import type { Task, TaskScores } from '@/types/task'

const defaultNewTitle = '\uc0c8 \uc5c5\ubb34'

const calendarHintText =
  '빈 시간대를 클릭하면 1시간 길이의 바가 생기며 새 업무 팝업이 바로 열립니다. 바를 드래그해 시간대를 옮기고, 하단 가장자리에서는 10분 단위로 길이를 조절할 수 있으며 최소 30분까지 줄일 수 있습니다. 이동이나 길이를 바꾼 뒤 놓으면(드롭) 팝업이 다시 열립니다. 시간이 잡힌 업무 바는 왼쪽 체크박스로 완료를 표시하고, 연필 버튼으로 수정 팝업을 엽니다. 같은 날 안에만 표시되는 업무 바는 드래그해 시간대를 바꿀 수 있습니다.'

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
const calendarStore = useCalendarUiStore()
const { selectedCalendarDay } = storeToRefs(calendarStore)

/** 30분 슬롯 한 행 높이(px). 기존 24에서 +10 — 짧은 블록에서도 시간 라벨이 잘리지 않도록. 타임라인 전체 높이 = 행높이 × 슬롯 수 */
const DAY_GRID_SLOT_ROW_HEIGHT_PX = 34
const slotCount = (24 * 60) / DEFAULT_SLOT_MINUTES
const rowHeight = DAY_GRID_SLOT_ROW_HEIGHT_PX
const DAY_GRID_BODY_HEIGHT_PX = rowHeight * slotCount
const totalMinutes = 24 * 60
const gridContentHeight = DAY_GRID_BODY_HEIGHT_PX

const DRAFT_SNAP_MINUTES = DEFAULT_SLOT_MINUTES
/** 업무 블록 이동·종료 리사이즈·드래프트 종료 리사이즈: 10분 스냅 */
const BLOCK_TIME_ADJUST_SNAP_MINUTES = 10
const DEFAULT_DRAFT_DURATION_MIN = 60
/** 리사이즈 시 최소 구간 길이(그리드 슬롯 한 칸 = 30분) */
const MIN_DRAFT_RESIZE_DURATION_MIN = DEFAULT_SLOT_MINUTES
const MIN_DRAFT_DURATION_MIN = DEFAULT_SLOT_MINUTES

/** 블록 세로 길이가 이 구간(분) 이하일 때 제목·시간 가로 배치 */
const BLOCK_COMPACT_ROW_MAX_DURATION_MIN = 40

/** 블록 시간 이동 드롭 후 시각 정착(브라우저 페인트 + 전환 구간) 뒤 API 호출 */
const BLOCK_DRAG_COMMIT_MS = 240

/** 타임라인 세로 스크롤 시 보이는 시작 시각(로컬 시, 0~23) */
const TIMELINE_SCROLL_START_HOUR = 5

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
const scrollAreaRef = ref<HTMLElement | null>(null)
const draftBarRef = ref<HTMLElement | null>(null)

const showHintTooltip = ref(false)
const hintBtnRef = ref<HTMLButtonElement | null>(null)
const hintTooltipPos = ref({ top: 0, left: 0 })

function openHintTooltip() {
  if (hintBtnRef.value) {
    const rect = hintBtnRef.value.getBoundingClientRect()
    hintTooltipPos.value = {
      top: rect.bottom + 6,
      left: rect.left + rect.width / 2,
    }
  }
  showHintTooltip.value = true
}

function closeHintTooltip() {
  showHintTooltip.value = false
}

function scrollTimelineToDefaultStart() {
  const el = scrollAreaRef.value
  if (!el) return
  const startMin = TIMELINE_SCROLL_START_HOUR * 60
  const targetTop = (startMin / totalMinutes) * gridContentHeight
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight)
  el.scrollTop = Math.min(targetTop, maxScroll)
}

watch(
  dayKey,
  () => {
    nextTick(() => {
      requestAnimationFrame(() => scrollTimelineToDefaultStart())
    })
  },
  { flush: 'post', immediate: true }
)

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

/** 모달이 열린 상태에서 드래프트 또는 시간 블록 드래그 중이면 패널만 페이드아웃 */
const quickModalContentVisible = computed(
  () =>
    !(modalOpen.value && (draftInteraction.value !== null || blockDragState.value !== null))
)

interface BlockDragState {
  taskId: string
  pointerId: number
  startClientY: number
  origStartMin: number
  origEndMin: number
  moved: boolean
  canDrag: boolean
  /** 하단 스트립: 종료 시각만 스냅 조절 */
  mode: 'move' | 'resize'
}

const blockDragState = ref<BlockDragState | null>(null)
const blockDragPreview = ref<{ taskId: string; startMin: number; endMin: number } | null>(null)

function blockCanTimeDrag(task: Task): boolean {
  return getTaskMinutesIfFullyOnLocalDay(task, dayKey.value) !== null
}

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

/** 기본 1h 블록 높이의 절반(30분 이하)일 때 제목·시간 가로 배치 */
const isDraftCompactRow = computed(
  () => draftEndMin.value - draftStartMin.value <= DEFAULT_DRAFT_DURATION_MIN / 2
)

const draftTimeRangeLabel = computed(() => {
  const a = localDayMinutesToIso(dayKey.value, draftStartMin.value)
  const b = localDayMinutesToIso(dayKey.value, draftEndMin.value)
  return formatTimeRangeLabel(a, b)
})

function minuteFromClientY(clientY: number): number {
  const grid = gridRef.value
  if (!grid) return 0
  const rect = grid.getBoundingClientRect()
  /** viewport 기준 그리드 상단까지 거리만 있으면 됨. scrollTop 을 더하면 스크롤 시 말일 근처로 잘못 잡힘 */
  const y = clientY - rect.top
  return minutesFromDayStartFromY(y, gridContentHeight, totalMinutes)
}

function yToDraftSnappedMinute(clientY: number): number {
  const rawMin = minuteFromClientY(clientY)
  return snapMinutesToSlot(rawMin, DRAFT_SNAP_MINUTES)
}

function blockStyle(task: Task) {
  const p = blockDragPreview.value
  if (p?.taskId === task.id) {
    const layout = layoutFromMinuteRange(p.startMin, p.endMin, gridContentHeight, totalMinutes, 4)
    return {
      top: `${layout.topPx}px`,
      height: `${layout.heightPx}px`,
    }
  }
  const layout = layoutTaskBlockForDay(task, dayKey.value, gridContentHeight, totalMinutes)
  if (!layout) return { display: 'none' }
  return {
    top: `${layout.topPx}px`,
    height: `${layout.heightPx}px`,
  }
}

/** 블록 세로 길이가 대략 40분 이하일 때 제목·시간 가로 배치 */
function isBlockCompactRow(task: Task): boolean {
  const p = blockDragPreview.value
  const durMin =
    p?.taskId === task.id ? p.endMin - p.startMin : visibleTaskDurationMinutesOnDay(task, dayKey.value)
  if (durMin === null || durMin <= 0) return false
  return durMin <= BLOCK_COMPACT_ROW_MAX_DURATION_MIN
}

function blockTimeLabel(task: Task): string {
  const p = blockDragPreview.value
  if (p?.taskId === task.id) {
    const sIso = localDayMinutesToIso(dayKey.value, p.startMin)
    const eIso = localDayMinutesToIso(dayKey.value, p.endMin)
    return formatTimeRangeLabel(sIso, eIso)
  }
  const s = task.startDate
  const d = task.deadline
  if (s && d) return formatTimeRangeLabel(s, d)
  if (s) return formatTimeLabel(s)
  if (d) return formatTimeLabel(d)
  return ''
}

function blockRowElFromEventTarget(target: EventTarget | null): HTMLElement | null {
  return (target as HTMLElement | null)?.closest('.task-day-cal__block') ?? null
}

function onBlockMovePointerDown(task: Task, e: PointerEvent) {
  if (e.button !== 0) return
  abandonUnsavedNewTaskUi()
  const range = getTaskMinutesIfFullyOnLocalDay(task, dayKey.value)
  const canDrag = range !== null
  blockDragState.value = {
    taskId: task.id,
    pointerId: e.pointerId,
    startClientY: e.clientY,
    origStartMin: range?.startMin ?? 0,
    origEndMin: range?.endMin ?? 0,
    moved: false,
    canDrag,
    mode: 'move',
  }
  if (canDrag && range)
    blockDragPreview.value = { taskId: task.id, startMin: range.startMin, endMin: range.endMin }
  else blockDragPreview.value = null
  const row = blockRowElFromEventTarget(e.currentTarget)
  row?.setPointerCapture(e.pointerId)
}

function onBlockResizePointerDown(task: Task, e: PointerEvent) {
  if (e.button !== 0) return
  abandonUnsavedNewTaskUi()
  const range = getTaskMinutesIfFullyOnLocalDay(task, dayKey.value)
  if (!range) return
  blockDragState.value = {
    taskId: task.id,
    pointerId: e.pointerId,
    startClientY: e.clientY,
    origStartMin: range.startMin,
    origEndMin: range.endMin,
    moved: false,
    canDrag: true,
    mode: 'resize',
  }
  blockDragPreview.value = { taskId: task.id, startMin: range.startMin, endMin: range.endMin }
  const row = blockRowElFromEventTarget(e.currentTarget)
  row?.setPointerCapture(e.pointerId)
}

function onBlockPointerMove(e: PointerEvent) {
  const st = blockDragState.value
  if (!st || st.pointerId !== e.pointerId) return
  if (Math.abs(e.clientY - st.startClientY) > 4) st.moved = true
  if (!st.canDrag) return

  if (st.mode === 'resize') {
    const rawEnd = minuteFromClientY(e.clientY)
    let newEnd = snapMinutesToSlot(rawEnd, BLOCK_TIME_ADJUST_SNAP_MINUTES)
    newEnd = Math.max(st.origStartMin + MIN_DRAFT_RESIZE_DURATION_MIN, newEnd)
    newEnd = Math.min(totalMinutes, newEnd)
    blockDragPreview.value = { taskId: st.taskId, startMin: st.origStartMin, endMin: newEnd }
    return
  }

  const dur = st.origEndMin - st.origStartMin
  const deltaMin = ((e.clientY - st.startClientY) / gridContentHeight) * totalMinutes
  let rawS = st.origStartMin + deltaMin
  rawS = Math.min(Math.max(rawS, 0), totalMinutes - dur)
  const s = snapMinutesToSlot(rawS, BLOCK_TIME_ADJUST_SNAP_MINUTES)
  let en = s + dur
  if (en > totalMinutes) {
    en = totalMinutes
    const adjS = Math.max(0, snapMinutesToSlot(en - dur, BLOCK_TIME_ADJUST_SNAP_MINUTES))
    blockDragPreview.value = { taskId: st.taskId, startMin: adjS, endMin: Math.min(totalMinutes, adjS + dur) }
  } else {
    blockDragPreview.value = { taskId: st.taskId, startMin: s, endMin: en }
  }
}

async function persistBlockDragAfterMotion(
  taskId: string,
  preview: { taskId: string; startMin: number; endMin: number },
  dk: string
) {
  try {
    await nextTick()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })
    await new Promise<void>((resolve) => setTimeout(resolve, BLOCK_DRAG_COMMIT_MS))
    await taskStore.updateTask(taskId, {
      startDate: localDayMinutesToIso(dk, preview.startMin),
      deadline: localDayMinutesToIso(dk, preview.endMin),
    })
  } finally {
    if (blockDragPreview.value?.taskId === taskId) blockDragPreview.value = null
  }
}

function onBlockPointerUp(e: PointerEvent) {
  const st = blockDragState.value
  if (!st || st.pointerId !== e.pointerId) return
  const el = e.currentTarget as HTMLElement
  if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)

  const savedPreview = st.canDrag ? blockDragPreview.value : null
  const { taskId, origStartMin, origEndMin, canDrag, moved, mode } = st
  blockDragState.value = null

  const task = taskStore.getTaskById(taskId)
  if (!task) {
    blockDragPreview.value = null
    return
  }

  const dk = dayKey.value

  if (canDrag && moved && savedPreview) {
    const changed =
      mode === 'resize'
        ? savedPreview.endMin !== origEndMin
        : savedPreview.startMin !== origStartMin || savedPreview.endMin !== origEndMin
    if (changed) {
      blockDragPreview.value = savedPreview
      void persistBlockDragAfterMotion(taskId, savedPreview, dk)
      return
    }
    blockDragPreview.value = null
    return
  }

  blockDragPreview.value = null
}

function onBlockEditClick(task: Task) {
  openEditModal(task)
}

async function onBlockToggleComplete(task: Task) {
  try {
    await taskStore.toggleTaskComplete(task.id)
  } catch {
    /* task-store 에서 error 처리 */
  }
}

function onBlockPointerCancel(e: PointerEvent) {
  const st = blockDragState.value
  if (!st || st.pointerId !== e.pointerId) return
  const el = e.currentTarget as HTMLElement
  if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
  blockDragState.value = null
  blockDragPreview.value = null
}

function onBlockDeleteClick(task: Task) {
  abandonUnsavedNewTaskUi()
  if (!confirm('정말 삭제하시겠습니까?')) return
  if (modalOpen.value && editingTaskId.value === task.id) closeModal()
  emit('delete', task.id)
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
  const shouldDiscardDraft =
    modalOpen.value && modalMode.value === 'create' && hasDraft.value
  modalOpen.value = false
  pendingStartIso.value = null
  pendingEndIso.value = null
  modalAnchorRect.value = null
  editingTaskId.value = null
  if (shouldDiscardDraft) hasDraft.value = false
}

function onQuickModalClose() {
  closeModal()
}

/** 저장하지 않은 새 업무(드래프트·생성 모달) 포기 — 기존 태스크 조작 시 호출 */
function abandonUnsavedNewTaskUi() {
  const hadDraft = hasDraft.value
  const hadCreateModal = modalOpen.value && modalMode.value === 'create'
  if (!hadDraft && !hadCreateModal) return

  hasDraft.value = false
  draftInteraction.value = null

  if (hadCreateModal) {
    modalOpen.value = false
    pendingStartIso.value = null
    pendingEndIso.value = null
    modalAnchorRect.value = null
    editingTaskId.value = null
  }
}

/** 생성 모달·저장 대기 시각을 현재 드래프트 구간과 동일하게 맞춤 */
function syncPendingCreateFromDraft() {
  const dk = dayKey.value
  const startIso = localDayMinutesToIso(dk, draftStartMin.value)
  const endIso = localDayMinutesToIso(dk, draftEndMin.value)
  pendingStartIso.value = startIso
  pendingEndIso.value = endIso
  modalSlotLabel.value = formatTimeRangeLabel(startIso, endIso)
}

//
function openCreateFromDraft() {
  syncPendingCreateFromDraft()
  modalMode.value = 'create'
  modalInitialTitle.value = defaultNewTitle
  modalInitialScores.value = { importance: 3, urgency: 3 }
  editingTaskId.value = null
  modalAnchorRect.value = null
  modalOpen.value = true
}

// 업무 선택 시 팝업 열기
function openEditModal(task: Task) {
  abandonUnsavedNewTaskUi()
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

// 드래프트 또는 시간 블록 드래그 중이면 패널만 페이드아웃
function placeOrMoveDraftAtMinute(m: number) {
  if (!hasDraft.value) {
    hasDraft.value = true
    draftStartMin.value = m
    draftEndMin.value = Math.min(m + DEFAULT_DRAFT_DURATION_MIN, totalMinutes)
    openCreateFromDraft()
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
  if (modalOpen.value && modalMode.value === 'create') syncPendingCreateFromDraft()
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
    if (modalOpen.value && modalMode.value === 'create') syncPendingCreateFromDraft()
    return
  }
  if (Math.abs(e.clientY - st.startClientY) > 4) st.moved = true
  const rawEnd = minuteFromClientY(e.clientY)
  let newEnd = snapMinutesToSlot(rawEnd, BLOCK_TIME_ADJUST_SNAP_MINUTES)
  newEnd = Math.max(draftStartMin.value + MIN_DRAFT_RESIZE_DURATION_MIN, newEnd)
  newEnd = Math.min(totalMinutes, newEnd)
  draftEndMin.value = newEnd
  if (modalOpen.value && modalMode.value === 'create') syncPendingCreateFromDraft()
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
  min-width: 0;
  width: 100%;
  max-width: 100%;
  flex: 1;
  box-sizing: border-box;
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

.task-day-cal__nav-title-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.task-day-cal__nav-label {
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

.task-day-cal__hint-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.task-day-cal__hint-btn {
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
  &:focus-visible {
    color: $color-primary;
    outline: none;
  }
}

.task-day-cal__hint-icon {
  width: 15px;
  height: 15px;
}

.task-day-cal__hint-tooltip {
  position: fixed;
  transform: translateX(-50%) translateY(-4px);
  max-width: min(280px, calc(100vw - 2rem));
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

.task-day-cal__draft--compact .task-day-cal__draft-main {
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
}

.task-day-cal__draft--compact .task-day-cal__draft-title {
  // flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-day-cal__draft--compact .task-day-cal__draft-time {
  // flex: 0 0 auto;
  white-space: nowrap;
  line-height: 1.2;
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
  padding: 0;
  border-radius: $radius-sm;
  border: none;
  text-align: left;
  cursor: default;
  background: rgba($color-primary, 0.12);
  border-left: 3px solid $color-primary;
  overflow: hidden;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0;
  box-sizing: border-box;
  touch-action: none;

  &:hover {
    background: rgba($color-primary, 0.2);
  }

  &--selected {
    box-shadow: 0 0 0 2px rgba($color-primary, 0.35);
  }

  &--dragging {
    z-index: 4;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  }

  &--settling {
    transition:
      top 0.24s ease-out,
      height 0.24s ease-out;
  }

  &--compact .task-day-cal__block-main {
    padding: 2px 8px;
  }

  &--compact .task-day-cal__block-inner {
    flex-direction: row;
    align-items: center;
    gap: 8px;
    flex-wrap: nowrap;
  }

  &--compact .task-day-cal__block-title {
    flex: 1;
    min-width: 0;
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    -webkit-line-clamp: unset;
    line-clamp: unset;
    -webkit-box-orient: unset;
  }

  &--compact .task-day-cal__block-time {
    flex-shrink: 0;
    white-space: nowrap;
    line-height: 1.2;
  }

  &--compact .task-day-cal__block-head {
    flex: 1;
    min-width: 0;
    align-items: center;
  }

  &--completed {
    opacity: 0.78;

    .task-day-cal__block-title {
      text-decoration: line-through;
      color: $color-gray-600;
    }
  }
}

.task-day-cal__block-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  cursor: default;

  &--draggable {
    cursor: grab;
    touch-action: none;

    &:active {
      cursor: grabbing;
    }
  }
}

.task-day-cal__block-resize {
  flex-shrink: 0;
  height: 8px;
  cursor: ns-resize;
  touch-action: none;
  background: rgba($color-primary, 0.18);
  border-top: 1px dotted rgba($color-primary, 0.45);

  &:hover {
    background: rgba($color-primary, 0.3);
  }
}

.task-day-cal__block-inner {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.task-day-cal__block-head {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.task-day-cal__block-check {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  margin: 2px 0 0;
  accent-color: $color-primary;
  cursor: pointer;
}

.task-day-cal__block-actions {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 0;
  margin: -2px -4px -2px 0;
}

.task-day-cal__block-edit {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-gray-500;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: $color-primary-dark;
    background: rgba($color-primary, 0.12);
  }
}

.task-day-cal__block-delete {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px;
  border: none;
  border-radius: $radius-sm;
  background: transparent;
  color: $color-gray-500;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;

  &:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.12);
  }
}

.task-day-cal__block-action-svg {
  width: 14px;
  height: 14px;
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
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.task-day-cal__block-time {
  font-size: 0.6875rem;
  font-weight: 600;
  color: $color-primary-dark;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.task-day-cal__block-meta {
  font-size: 0.625rem;
  color: $color-gray-500;
}
</style>

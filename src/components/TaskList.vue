<template>
  <div class="task-list">
    <div class="task-list__section-head">
      <h2 class="task-list__section-title">{{ props.sectionTitle }}</h2>
      <button
        type="button"
        class="task-list__title-popup-open"
        aria-label="이 날짜 업무 제목 목록 보기"
        title="제목 목록"
        @click="isTitlePopupOpen = true"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          class="task-list__title-popup-open-icon" aria-hidden="true">
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <div class="task-list__timeline-wrap">
      <TaskDayCalendar
        :selected-task-id="props.selectedTaskId"
        @select="emit('select', $event)"
        @delete="emit('delete', $event)"
      />
    </div>

    <Teleport to="body">
      <div
        v-if="isTitlePopupOpen"
        ref="titlePopupRootRef"
        class="task-list__title-popup-root"
        tabindex="-1"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titlePopupHeadingId"
        @keydown.escape.prevent="closeTitlePopup"
      >
        <div class="task-list__title-popup-backdrop" aria-hidden="true" @click="closeTitlePopup" />
        <div class="task-list__title-popup-panel" @click.stop>
          <div class="task-list__title-popup-head">
            <h3 :id="titlePopupHeadingId" class="task-list__title-popup-heading">{{ popupHeading }}</h3>
            <button type="button" class="task-list__title-popup-close" aria-label="닫기" @click="closeTitlePopup">
              닫기
            </button>
          </div>
          <div class="task-list__title-popup-toolbar">
            <button type="button" class="task-list__title-popup-copy" :disabled="calendarDayTasksForTitlePopup.length === 0"
              @click="copyPopupTitles">
              전체 복사
            </button>
          </div>
          <ul v-if="calendarDayTasksForTitlePopup.length > 0" class="task-list__title-popup-list">
            <li v-for="t in calendarDayTasksForTitlePopup" :key="t.id" class="task-list__title-popup-item">
              {{ t.title }}
            </li>
          </ul>
          <p v-else class="task-list__title-popup-empty">이 날짜에 표시되는 업무가 없습니다.</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTaskStore } from '@/stores/task-store'
import { useCalendarUiStore } from '@/stores/calendar-ui-store'
import TaskDayCalendar from './TaskDayCalendar.vue'
import { TASK_LIST_DAY_SECTION_TITLE } from '@/constants/task-list-ui'
import { taskShowsOnDayGrid, formatDayNavLabel } from '@/utils/day-calendar'
import { getTodayLocalDateKey } from '@/utils/task-calendar'
import type { Task } from '@/types/task'

interface Props {
  selectedTaskId?: string
  /** 미지정 시 `TASK_LIST_DAY_SECTION_TITLE`과 동일 */
  sectionTitle?: string
}

interface Emits {
  (e: 'select', taskId: string): void
  (e: 'delete', taskId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  sectionTitle: TASK_LIST_DAY_SECTION_TITLE,
})
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const calendarStore = useCalendarUiStore()
const { selectedCalendarDay } = storeToRefs(calendarStore)

const calendarDayKey = computed(() => selectedCalendarDay.value ?? getTodayLocalDateKey())

function sortTimedTaskBySchedule(a: Task, b: Task): number {
  const ta = new Date(a.startDate ?? a.deadline ?? 0).getTime()
  const tb = new Date(b.startDate ?? b.deadline ?? 0).getTime()
  return ta - tb
}

/** 캘린더에 그려지는 업무와 동일 기준·순서(시간순 → 시간 없음) */
const calendarDayTasksForTitlePopup = computed(() => {
  const dk = calendarDayKey.value
  const all = taskStore.tasks.filter((t) => taskShowsOnDayGrid(t, dk))
  const timed = all.filter((t) => !!(t.startDate || t.deadline))
  const anchor = all.filter((t) => !t.startDate && !t.deadline)
  timed.sort(sortTimedTaskBySchedule)
  return [...timed, ...anchor]
})

const popupHeading = computed(() => `${formatDayNavLabel(calendarDayKey.value)} 업무 제목`)

const isTitlePopupOpen = ref(false)
const titlePopupRootRef = ref<HTMLElement | null>(null)
const titlePopupHeadingId = `task-list-title-popup-h-${Math.random().toString(36).slice(2, 9)}`

function closeTitlePopup() {
  isTitlePopupOpen.value = false
}

async function copyPopupTitles() {
  const text = calendarDayTasksForTitlePopup.value.map((t) => t.title).join('\n')
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* 클립보드 거부 등은 무시 */
  }
}

watch(isTitlePopupOpen, async (open) => {
  if (!open) return
  await nextTick()
  titlePopupRootRef.value?.focus()
})

watch(
  () => props.selectedTaskId,
  (taskId) => {
    if (!taskId) return
    const task = taskStore.tasks.find((t) => t.id === taskId)
    if (!task) return
    calendarStore.applyForTask(task)
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.task-list {
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.task-list__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $spacing-sm;
  flex-shrink: 0;
  margin-bottom: $spacing-sm;
}

.task-list__section-title {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: $color-gray-800;
  line-height: 1.25;
}

.task-list__title-popup-open {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  color: $color-gray-500;
  cursor: pointer;
  transition:
    color 0.15s,
    border-color 0.15s,
    background 0.15s;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
    background: rgba($color-primary, 0.06);
  }
}

.task-list__title-popup-open-icon {
  width: 18px;
  height: 18px;
}

.task-list__timeline-wrap {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-list__title-popup-root {
  position: fixed;
  inset: 0;
  z-index: 3200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-md;
  outline: none;
}

.task-list__title-popup-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
}

.task-list__title-popup-panel {
  position: relative;
  z-index: 1;
  width: min(400px, calc(100vw - 2rem));
  max-height: min(480px, calc(100vh - 4rem));
  display: flex;
  flex-direction: column;
  padding: $spacing-md $spacing-lg;
  background: $color-white;
  border-radius: $radius-lg;
  box-shadow: $shadow-lg;
}

.task-list__title-popup-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;
}

.task-list__title-popup-heading {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: $color-gray-900;
  line-height: 1.35;
}

.task-list__title-popup-close {
  flex-shrink: 0;
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  background: $color-white;
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-gray-700;
  cursor: pointer;

  &:hover {
    background: $color-gray-50;
  }
}

.task-list__title-popup-toolbar {
  margin-bottom: $spacing-sm;
}

.task-list__title-popup-copy {
  padding: $spacing-xs $spacing-sm;
  border: 1px solid $color-primary;
  border-radius: $radius-md;
  background: rgba($color-primary, 0.08);
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-primary-dark;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: rgba($color-primary, 0.14);
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.task-list__title-popup-list {
  margin: 0;
  padding: 0 0 0 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: $color-gray-800;
}

.task-list__title-popup-item {
  margin-bottom: $spacing-xs;

  &:last-child {
    margin-bottom: 0;
  }
}

.task-list__title-popup-empty {
  margin: 0;
  font-size: 0.8125rem;
  color: $color-gray-500;
}
</style>

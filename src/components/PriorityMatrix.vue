<template>
  <div class="priority-matrix">
    <div class="priority-matrix__header">
      <h2 class="priority-matrix__title">우선순위 매트릭스</h2>
    </div>

    <div ref="containerRef" class="priority-matrix__container">
      <svg
        class="priority-matrix__svg"
        :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- Grid lines -->
        <line
          :x1="centerX"
          :y1="0"
          :x2="centerX"
          :y2="viewBoxHeight"
          stroke="#e5e7eb"
          stroke-width="2"
          stroke-dasharray="4 4"
        />
        <line
          :x1="0"
          :y1="centerY"
          :x2="viewBoxWidth"
          :y2="centerY"
          stroke="#e5e7eb"
          stroke-width="2"
          stroke-dasharray="4 4"
        />

        <!-- Quadrant labels -->
        <!-- A: 중요도 높음, 시급성 높음 (오른쪽 상단) -->
        <text
          :x="(viewBoxWidth + centerX) / 2"
          :y="centerY / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          class="priority-matrix__quadrant-label priority-matrix__quadrant-label--a"
        >
          A
        </text>
        <!-- B: 중요도 높음, 시급성 낮음 (오른쪽 하단) -->
        <text
          :x="(viewBoxWidth + centerX) / 2"
          :y="(viewBoxHeight + centerY) / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          class="priority-matrix__quadrant-label priority-matrix__quadrant-label--b"
        >
          B
        </text>
        <!-- C: 중요도 낮음, 시급성 높음 (왼쪽 상단) -->
        <text
          :x="centerX / 2"
          :y="centerY / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          class="priority-matrix__quadrant-label priority-matrix__quadrant-label--c"
        >
          C
        </text>
        <!-- D: 중요도 낮음, 시급성 낮음 (왼쪽 하단) -->
        <text
          :x="centerX / 2"
          :y="(viewBoxHeight + centerY) / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          class="priority-matrix__quadrant-label priority-matrix__quadrant-label--d"
        >
          D
        </text>

        <!-- Axis labels -->
        <text
          :x="centerX / 2"
          :y="viewBoxHeight - 20"
          text-anchor="middle"
          class="priority-matrix__axis-label"
        >
          중요도 낮음
        </text>
        <text
          :x="(viewBoxWidth + centerX) / 2"
          :y="viewBoxHeight - 20"
          text-anchor="middle"
          class="priority-matrix__axis-label"
        >
          중요도 높음
        </text>
        <text
          :x="20"
          :y="centerY / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          class="priority-matrix__axis-label priority-matrix__axis-label--vertical"
        >
          시급성 높음
        </text>
        <text
          :x="20"
          :y="(viewBoxHeight + centerY) / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          class="priority-matrix__axis-label priority-matrix__axis-label--vertical"
        >
          시급성 낮음
        </text>
      </svg>

      <!-- Task cards positioned absolutely -->
      <div
        v-for="task in tasksWithComputed"
        :key="task.id"
        class="priority-matrix__task-card"
        :class="`priority-matrix__task-card--${task.quadrant.toLowerCase()}`"
        :style="getTaskCardStyle(task)"
        @click="handleTaskClick(task.id)"
        @mouseenter="hoveredTaskId = task.id"
        @mouseleave="hoveredTaskId = null"
      >
        <div class="priority-matrix__task-card-content">
          <h3 class="priority-matrix__task-card-title">{{ task.title }}</h3>
          <div
            v-if="hoveredTaskId === task.id"
            class="priority-matrix__task-card-scores"
          >
            <div class="priority-matrix__task-card-score">
              중요도: {{ task.computedScores.importanceScore }}
            </div>
            <div class="priority-matrix__task-card-score">
              시급성: {{ task.computedScores.urgencyScore }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import type { TaskWithComputed } from '@/types/task'

interface Props {
  selectedTaskId?: string
}

interface Emits {
  (e: 'select', taskId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const tasksWithComputed = computed(() => taskStore.tasksWithComputed)

const hoveredTaskId = ref<string | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)
const containerHeight = ref(0)

const viewBoxWidth = 800
const viewBoxHeight = 600
const centerX = viewBoxWidth / 2
const centerY = viewBoxHeight / 2
const scoreRange = 2 // -2 to +2
const paddingPx = 20 // 20px padding from edges
const cardMaxWidth = 180 // max-width of task card
const cardMaxHeight = 100 // estimated max height of task card

function normalizeScore(score: number): number {
  // -2~+2를 0~1 범위로 정규화
  return (score + scoreRange) / (scoreRange * 2)
}

function updateContainerSize() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
  }
}

function getTaskCardStyle(task: TaskWithComputed) {
  const { importanceScore, urgencyScore } = task.computedScores

  // Normalize scores to 0-1 range
  const normalizedImportance = normalizeScore(importanceScore)
  const normalizedUrgency = normalizeScore(urgencyScore)

  // 20px 여백을 포함하여 위치 계산
  // X: left to right (importance: low to high, 0 = left, 1 = right)
  // Y: top to bottom (urgency: high at top, low at bottom, 0 = top, 1 = bottom)
  if (containerWidth.value === 0 || containerHeight.value === 0) {
    // 컨테이너 크기가 없으면 백분율 기준으로 위치 계산
    const xPercent = normalizedImportance * 100
    const yPercent = (1 - normalizedUrgency) * 100
    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
      transform: 'translate(-50%, -50%)',
    }
  }

  // 여백(padding)을 포함하여 픽셀 기준으로 위치 계산
  // transform이 카드의 중앙을 기준으로 적용되기 때문에 카드 크기를 고려함
  const cardHalfWidth = cardMaxWidth / 2
  const cardHalfHeight = cardMaxHeight / 2
  
  // 카드 크기를 고려한 사용 가능한 영역
  const availableWidth = containerWidth.value - (paddingPx + cardHalfWidth) * 2
  const availableHeight = containerHeight.value - (paddingPx + cardHalfHeight) * 2
  
  // 카드가 가능한 영역 내에 위치하도록 위치 계산
  const x = paddingPx + cardHalfWidth + normalizedImportance * availableWidth
  const y = paddingPx + cardHalfHeight + (1 - normalizedUrgency) * availableHeight

  return {
    left: `${x}px`,
    top: `${y}px`,
    transform: 'translate(-50%, -50%)',
  }
}

function handleTaskClick(taskId: string) {
  emit('select', taskId)
}

let resizeObserver: ResizeObserver | null = null

onMounted(async () => {
  await nextTick()
  updateContainerSize()
  window.addEventListener('resize', updateContainerSize)
  
  // 더 정확한 크기 추적을 위해 ResizeObserver 사용
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize()
    })
    resizeObserver.observe(containerRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<style lang="scss" scoped>
.priority-matrix {
  // height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.priority-matrix__header {
  margin-bottom: $spacing-lg;
}

.priority-matrix__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: $color-gray-900;
}

.priority-matrix__container {
  position: relative;
  width: 80%;
  height: 80%;
  margin: 0 auto;
  background: $color-white;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-md;
}

.priority-matrix__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.priority-matrix__quadrant-label {
  font-size: 48px;
  font-weight: 700;
  opacity: 0.1;

  &--a {
    fill: $color-danger;
  }

  &--b {
    fill: $color-success;
  }

  &--c {
    fill: $color-warning;
  }

  &--d {
    fill: $color-gray-400;
  }
}

.priority-matrix__axis-label {
  font-size: 14px;
  font-weight: 600;
  fill: $color-gray-600;

  &--vertical {
    writing-mode: vertical-rl;
    text-orientation: mixed;
  }
}

.priority-matrix__task-card {
  position: absolute;
  min-width: 120px;
  max-width: 180px;
  padding: $spacing-md;
  background: $color-white;
  border-radius: $radius-md;
  box-shadow: $shadow-md;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    box-shadow: $shadow-lg;
    transform: translate(-50%, -50%) scale(1.05);
    z-index: 10;
  }

  &--a {
    border-color: $color-danger;

    &:hover {
      background: rgba($color-danger, 0.05);
    }
  }

  &--b {
    border-color: $color-success;

    &:hover {
      background: rgba($color-success, 0.05);
    }
  }

  &--c {
    border-color: $color-warning;

    &:hover {
      background: rgba($color-warning, 0.05);
    }
  }

  &--d {
    border-color: $color-gray-400;

    &:hover {
      background: rgba($color-gray-400, 0.05);
    }
  }
}

.priority-matrix__task-card-content {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
}

.priority-matrix__task-card-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-900;
  line-height: 1.4;
  word-break: break-word;
}

.priority-matrix__task-card-scores {
  display: flex;
  flex-direction: column;
  gap: $spacing-xs;
  margin-top: $spacing-xs;
  padding-top: $spacing-xs;
  border-top: 1px solid $color-gray-200;
}

.priority-matrix__task-card-score {
  font-size: 0.75rem;
  color: $color-gray-600;
}
</style>


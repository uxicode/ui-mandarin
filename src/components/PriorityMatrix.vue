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

      <!-- Backdrop: fan-out 영역 밖으로 나가면 collapse -->
      <div
        v-if="backdropStyle"
        class="priority-matrix__cluster-backdrop"
        :style="backdropStyle"
        @mouseleave="hoveredClusterIndex = null"
      />

      <!-- Task cards positioned absolutely -->
      <div
        v-for="task in tasksWithComputed"
        :key="task.id"
        class="priority-matrix__task-card"
        :class="[
          `priority-matrix__task-card--${task.quadrant.toLowerCase()}`,
          {
            'priority-matrix__task-card--completed': task.completed,
            'priority-matrix__task-card--selected': props.selectedTaskId === task.id
          }
        ]"
        :style="getTaskCardStyle(task)"
        @click="handleTaskClick(task.id)"
        @mouseenter="onCardMouseEnter(task.id)"
        @mouseleave="onCardMouseLeave"
      >
        <div class="priority-matrix__task-card-content">
          <h3 
            class="priority-matrix__task-card-title" 
            :class="{ 'priority-matrix__task-card-title--completed': task.completed }"
          >
            {{ task.title }}
          </h3>
          <div
            v-if="hoveredTaskId === task.id || props.selectedTaskId === task.id"
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
import { getWeekStartMondayKey, includeCompletedTaskInMatrix } from '@/utils/task-calendar'
import type { TaskWithComputed } from '@/types/task'

interface Props {
  selectedTaskId?: string
}

interface Emits {
  (e: 'select', taskId: string): void
  (e: 'clearSelection'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()

const tasksWithComputed = computed(() => {
  const weekStartKey = getWeekStartMondayKey()
  return taskStore.tasksWithComputed.filter((t) => includeCompletedTaskInMatrix(t, weekStartKey))
})

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
const CLUSTER_GRID_SIZE = 20 // same (rx,ry) => same cluster
const FAN_OUT_RADIUS = 70 // px

const hoveredClusterIndex = ref<number | null>(null)

function normalizeScore(score: number): number {
  // -2~+2를 0~1 범위로 정규화
  return (score + scoreRange) / (scoreRange * 2)
}

/** 픽셀 좌표 (x, y) 반환. 컨테이너 크기 0이면 null */
function getTaskPixelPosition(task: TaskWithComputed): { x: number; y: number } | null {
  if (containerWidth.value === 0 || containerHeight.value === 0) return null
  const normalizedImportance = normalizeScore(task.computedScores.importanceScore)
  const normalizedUrgency = normalizeScore(task.computedScores.urgencyScore)
  const cardHalfWidth = cardMaxWidth / 2
  const cardHalfHeight = cardMaxHeight / 2
  const availableWidth = containerWidth.value - (paddingPx + cardHalfWidth) * 2
  const availableHeight = containerHeight.value - (paddingPx + cardHalfHeight) * 2
  const x = paddingPx + cardHalfWidth + normalizedImportance * availableWidth
  const y = paddingPx + cardHalfHeight + (1 - normalizedUrgency) * availableHeight
  return { x, y }
}

interface Cluster {
  centerX: number
  centerY: number
  tasks: TaskWithComputed[]
}

const clusters = computed<Cluster[]>(() => {
  const tasks = tasksWithComputed.value
  if (containerWidth.value === 0 || containerHeight.value === 0) return []
  const gridToTasks = new Map<string, { x: number; y: number; task: TaskWithComputed }[]>()
  for (const task of tasks) {
    const pos = getTaskPixelPosition(task)
    if (!pos) continue
    const rx = Math.round(pos.x / CLUSTER_GRID_SIZE) * CLUSTER_GRID_SIZE
    const ry = Math.round(pos.y / CLUSTER_GRID_SIZE) * CLUSTER_GRID_SIZE
    const key = `${rx},${ry}`
    const list = gridToTasks.get(key) ?? []
    list.push({ x: pos.x, y: pos.y, task })
    gridToTasks.set(key, list)
  }
  const result: Cluster[] = []
  for (const list of gridToTasks.values()) {
    const centerX = list.reduce((s, p) => s + p.x, 0) / list.length
    const centerY = list.reduce((s, p) => s + p.y, 0) / list.length
    result.push({ centerX, centerY, tasks: list.map((p) => p.task) })
  }
  return result
})

/** taskId -> { clusterIndex, indexInCluster } */
const taskToCluster = computed(() => {
  const map = new Map<string, { clusterIndex: number; indexInCluster: number }>()
  clusters.value.forEach((cluster, ci) => {
    cluster.tasks.forEach((task, ii) => {
      map.set(task.id, { clusterIndex: ci, indexInCluster: ii })
    })
  })
  return map
})

function updateContainerSize() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth
    containerHeight.value = containerRef.value.clientHeight
  }
}
// getTaskCardStyle 함수 내부의 주요 계산마다 주석 추가

function getTaskCardStyle(task: TaskWithComputed): Record<string, string | number> {
  // 중요도와 시급성 점수를 추출
  const { importanceScore, urgencyScore } = task.computedScores
  // 중요도, 시급성 0~1로 정규화
  const normalizedImportance = normalizeScore(importanceScore)
  const normalizedUrgency = normalizeScore(urgencyScore)

  // 컨테이너 크기를 아직 측정하지 못한 경우, 퍼센트로 위치 계산
  if (containerWidth.value === 0 || containerHeight.value === 0) {
    const xPercent = normalizedImportance * 100 // 좌측-우측 간 상대적 위치 (%)
    const yPercent = (1 - normalizedUrgency) * 100 // 상단-하단 간 상대적 위치 (%)
    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
      zIndex: (props.selectedTaskId === task.id || hoveredTaskId.value === task.id) ? 11 : task.completed ? 0 : 1,
    }
  }

  // 클러스터 정보 및 현재 마우스 hover 상태 등 구함
  const info = taskToCluster.value.get(task.id)
  const hovered = hoveredClusterIndex.value
  // 현재 hover된 클러스터 객체
  const cluster = info !== undefined && hovered !== null ? clusters.value[hovered] : null
  // 해당 태스크가 hover된 클러스터에 포함되어 있고, 군집이 2개 이상일 때인지
  const isHoveredCluster = info !== undefined && hovered === info.clusterIndex && cluster && cluster.tasks.length > 1

  // 선택된 카드면 zIndex 최고, hover 시 10, 완료된 카드는 비활성 시 진행중 카드 아래에 배치
  const isSelected = props.selectedTaskId === task.id
  const isHovered = hoveredTaskId.value === task.id
  const isInHoveredCluster = info !== undefined && hovered === info.clusterIndex
  // 직접 hover된 카드는 12, 선택/클러스터 내 카드는 11, 진행중 기본 1, 완료 비활성 0
  const baseZ = isHovered ? 12 : (isSelected || isInHoveredCluster) ? 11 : task.completed ? 0 : 1

  if (isHoveredCluster && cluster) {
    // fan-out 효과: 원형으로 분산
    const n = cluster.tasks.length // 군집 내 태스크 개수
    const i = info!.indexInCluster // 군집 내 인덱스
    // [0, 2π) 각도로 분배
    const theta = (2 * Math.PI * i) / n + 45;
    const cx = cluster.centerX // 군집 중심 x좌표
    const cy = cluster.centerY // 군집 중심 y좌표
    // fan-out 반지름을 기준으로 원형 위치 산출
    const left = cx + FAN_OUT_RADIUS * Math.cos(theta)
    const top = cy + FAN_OUT_RADIUS * Math.sin(theta)
    return {
      left: `${left}px`,
      top: `${top}px`,
      zIndex: baseZ,
    }
  }

  // 일반 배치(군집 정보 없음)은 실제 픽셀 좌표 반환
  const pos = getTaskPixelPosition(task)
  if (!pos) {
    // 예외적으로 좌표 계산 불가 시 %로 대체
    const xPercent = normalizedImportance * 100
    const yPercent = (1 - normalizedUrgency) * 100
    return {
      left: `${xPercent}%`,
      top: `${yPercent}%`,
      zIndex: baseZ,
    }
  }

  // 계산된 픽셀 좌표 기준 배치
  return {
    left: `${pos.x}px`,
    top: `${pos.y}px`,
    zIndex: baseZ,
  }
}

function handleTaskClick(taskId: string) {
  emit('select', taskId)
}

function onCardMouseEnter(taskId: string) {
  emit('clearSelection')
  const info = taskToCluster.value.get(taskId)
  if (info !== undefined) hoveredClusterIndex.value = info.clusterIndex
  hoveredTaskId.value = taskId
}

function onCardMouseLeave() {
  hoveredTaskId.value = null
  // 단일 카드(백드롭 없음)는 직접 클러스터 hover도 해제
  if (hoveredClusterIndex.value !== null) {
    const cluster = clusters.value[hoveredClusterIndex.value]
    if (!cluster || cluster.tasks.length <= 1) {
      hoveredClusterIndex.value = null
    }
  }
}

/** Fan-out 영역 백드롭 스타일 (마우스가 영역 밖으로 나가면 collapse) */
const backdropStyle = computed<Record<string, string | number> | null>(() => {
  if (hoveredClusterIndex.value === null) return null
  const cluster = clusters.value[hoveredClusterIndex.value]
  if (!cluster || cluster.tasks.length <= 1) return null
  const half = FAN_OUT_RADIUS + Math.max(cardMaxWidth, cardMaxHeight) / 2
  const left = cluster.centerX - half
  const top = cluster.centerY - half
  const size = half * 2
  return {
    position: 'absolute',
    left: `${left}px`,
    top: `${top}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: 8,
  }
})

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
  width: 100%;
  height: 100%;
  margin: 0 auto;
  background: $color-white;
  border-radius: $radius-lg;
  // overflow: hidden;
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

.priority-matrix__cluster-backdrop {
  pointer-events: auto;
  background: transparent;
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
  transform: translate(-50%, -50%);

  &:hover,
  &--selected {
    box-shadow: $shadow-lg;
    transform: translate(-50%, -50%) scale(1.05);
    z-index: 10;
    .priority-matrix__task-card-title, .priority-matrix__task-card-score {
      color: #fff !important;
    }
  }

  &--completed {
    // opacity: 0.5;
    background: $color-gray-100;
    border-style: dashed;

  }

  &--a {
    border-color: $color-danger;

    &:hover,
    &.priority-matrix__task-card--selected {
      background: rgba($color-danger, 1);
    }
  }

  &--b {
    border-color: $color-success;

    &:hover,
    &.priority-matrix__task-card--selected {
      background: rgba($color-success, 1);
    }
  }

  &--c {
    border-color: $color-warning;

    &:hover,
    &.priority-matrix__task-card--selected {
      background: rgba($color-warning, 1);
    }
  }

  &--d {
    border-color: $color-gray-400;

    &:hover,
    &.priority-matrix__task-card--selected {
      background: rgba($color-gray-400, 1);
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

  &--completed {
    text-decoration: line-through;
    color: $color-gray-300;
  }
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


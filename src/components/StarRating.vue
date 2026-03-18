<template>
  <div class="star-rating">
    <label class="star-rating__label">{{ label }}</label>
    <div
      ref="starsRef"
      class="star-rating__stars"
      @mousedown.prevent="onMouseDown"
      @mousemove="onMouseMoveLocal"
      @mouseleave="onMouseLeave"
    >
      <div v-for="star in 5" :key="star" class="star-rating__star">
        <!-- Gray background star -->
        <svg
          class="star-rating__icon star-rating__icon--bg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
        <!-- Yellow foreground star clipped by fill amount -->
        <svg
          class="star-rating__icon star-rating__icon--fg"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          :style="getFillStyle(star)"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </div>
    </div>
    <span class="star-rating__value">{{ displayValue }}/5</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

interface Props {
  label: string
  value: number
}

interface Emits {
  (e: 'update:value', value: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const starsRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const hoverValue = ref<number | null>(null)

const displayValue = computed(() => hoverValue.value ?? props.value)

function getValueFromClientX(clientX: number): number {
  const el = starsRef.value
  if (!el) return props.value
  const rect = el.getBoundingClientRect()
  const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
  const starWidth = rect.width / 5
  const rawStar = x / starWidth
  const starIndex = Math.floor(rawStar) + 1
  const withinStar = rawStar - Math.floor(rawStar)
  const value = withinStar < 0.5 ? starIndex - 0.5 : starIndex
  return Math.min(5, Math.max(1, value))
}

function getFillStyle(star: number) {
  const v = displayValue.value
  if (v >= star) {
    return { clipPath: 'inset(0 0% 0 0)' }
  } else if (v >= star - 0.5) {
    return { clipPath: 'inset(0 50% 0 0)' }
  } else {
    return { clipPath: 'inset(0 100% 0 0)' }
  }
}

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  hoverValue.value = getValueFromClientX(e.clientX)
  window.addEventListener('mousemove', onWindowMouseMove)
  window.addEventListener('mouseup', onWindowMouseUp)
}

function onWindowMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  hoverValue.value = getValueFromClientX(e.clientX)
}

function onWindowMouseUp() {
  if (isDragging.value && hoverValue.value !== null) {
    emit('update:value', hoverValue.value)
  }
  isDragging.value = false
  hoverValue.value = null
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
}

function onMouseMoveLocal(e: MouseEvent) {
  if (isDragging.value) return
  hoverValue.value = getValueFromClientX(e.clientX)
}

function onMouseLeave() {
  if (!isDragging.value) {
    hoverValue.value = null
  }
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onWindowMouseMove)
  window.removeEventListener('mouseup', onWindowMouseUp)
})
</script>

<style lang="scss" scoped>
.star-rating {
  display: flex;
  align-items: center;
  gap: $spacing-md;
  padding: $spacing-sm 0;
}

.star-rating__label {
  min-width: 120px;
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-gray-700;
}

.star-rating__stars {
  display: flex;
  gap: $spacing-xs;
  cursor: grab;
  user-select: none;

  &:active {
    cursor: grabbing;
  }
}

.star-rating__star {
  position: relative;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.star-rating__icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 24px;
  height: 24px;

  &--bg {
    color: $color-gray-300;
  }

  &--fg {
    color: $color-warning;
    clip-path: inset(0 100% 0 0);
    transition: clip-path 0.08s ease;
  }
}

.star-rating__value {
  min-width: 40px;
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-600;
  text-align: right;
}
</style>

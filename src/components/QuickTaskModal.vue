<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="quick-task-modal__root"
      role="presentation"
      @keydown.escape.prevent="emit('close')"
    >
      <div
        class="quick-task-modal"
        :class="{ 'quick-task-modal--content-hidden': !contentVisible }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :style="panelInlineStyle"
      >
        <h2 :id="titleId" class="quick-task-modal__heading">
          {{ mode === 'create' ? '새 업무' : '업무 수정' }}
        </h2>
        <p v-if="slotLabel" class="quick-task-modal__slot">{{ slotLabel }}</p>

        <label class="quick-task-modal__label" :for="inputId">제목</label>
        <input
          :id="inputId"
          ref="titleInputRef"
          v-model="titleModel"
          type="text"
          class="quick-task-modal__input"
          placeholder="업무 제목"
          required
          autocomplete="off"
          @keydown.enter.prevent="submit"
        />

        <div class="quick-task-modal__scores">
          <StarRating v-model:value="importanceModel" label="중요도" />
          <StarRating v-model:value="urgencyModel" label="시급성" />
        </div>

        <div class="quick-task-modal__actions">
          <button
            type="button"
            class="quick-task-modal__btn quick-task-modal__btn--ghost"
            :disabled="isSubmitting"
            @click="emit('close')"
          >
            취소
          </button>
          <button
            type="button"
            class="quick-task-modal__btn quick-task-modal__btn--primary"
            :disabled="isSubmitting || !titleModel.trim()"
            @click="submit"
          >
            {{ mode === 'create' ? '추가' : '저장' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import StarRating from './StarRating.vue'
import type { TaskScores } from '@/types/task'

export interface PanelAnchor {
  top: number
  left: number
  width: number
  height: number
}

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  slotLabel?: string
  initialTitle?: string
  initialScores?: TaskScores
  isSubmitting?: boolean
  /** 드래프트 바 기준 위치 (px) */
  anchorRect?: PanelAnchor | null
  /** false면 패널만 페이드아웃(open은 유지, 드래프트 드래그 중 등) */
  contentVisible?: boolean
}

interface Emits {
  (e: 'close'): void
  (e: 'submit', payload: { title: string; scores: TaskScores }): void
}

const props = withDefaults(defineProps<Props>(), {
  slotLabel: '',
  initialTitle: '',
  isSubmitting: false,
  anchorRect: null,
  contentVisible: true,
})

const emit = defineEmits<Emits>()

const titleId = `quick-task-modal-title-${Math.random().toString(36).slice(2, 9)}`
const inputId = `${titleId}-input`

const titleModel = ref('')
const importanceModel = ref(3)
const urgencyModel = ref(3)
const titleInputRef = ref<HTMLInputElement | null>(null)

const panelInlineStyle = computed(() => {
  const a = props.anchorRect
  if (!a) {
    return {
      position: 'fixed' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(0, -50%)',
      width: 'min(400px, calc(100vw - 2rem))',
    }
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const panelW = Math.min(400, vw - 16)
  let left = a.left
  let top = a.top + a.height + 8
  if (left + panelW > vw - 8) left = Math.max(8, vw - panelW - 8)
  if (top + 320 > vh) top = Math.max(8, a.top - 320 - 8)
  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${left}px`,
    width: `${panelW}px`,
    transform: 'none',
  }
})

watch(
  () => [props.open, props.initialTitle, props.initialScores] as const,
  ([isOpen]) => {
    if (!isOpen) return
    titleModel.value = props.initialTitle ?? ''
    importanceModel.value = props.initialScores?.importance ?? 3
    urgencyModel.value = props.initialScores?.urgency ?? 3
    nextTick(() => titleInputRef.value?.focus())
  },
  { immediate: true }
)

function submit() {
  const title = titleModel.value.trim()
  if (!title) return
  emit('submit', {
    title,
    scores: {
      importance: importanceModel.value,
      urgency: urgencyModel.value,
    },
  })
}
</script>

<style lang="scss" scoped>
@use '@/styles/index.scss' as *;

/* 전체 화면을 가리지 않음 — 배경 차단 없음 */
.quick-task-modal__root {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
}

.quick-task-modal {
  pointer-events: auto;
  max-width: 400px;
  background: $color-white;
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow:
    $shadow-lg,
    0 0 0 1px rgba($color-gray-200, 0.9);
  opacity: 1;
  transition: opacity 0.22s ease;

  &--content-hidden {
    opacity: 0;
    pointer-events: none;
  }
}

.quick-task-modal__heading {
  font-size: 1.125rem;
  font-weight: 700;
  color: $color-gray-900;
  margin: 0 0 $spacing-sm;
}

.quick-task-modal__slot {
  font-size: 0.8125rem;
  font-weight: 600;
  color: $color-primary-dark;
  margin: 0 0 $spacing-md;
}

.quick-task-modal__label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: $color-gray-700;
  margin-bottom: $spacing-xs;
}

.quick-task-modal__input {
  width: 100%;
  padding: $spacing-sm $spacing-md;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 0.9375rem;
  margin-bottom: $spacing-md;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba($color-primary, 0.2);
  }
}

.quick-task-modal__scores {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;
}

.quick-task-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: $spacing-sm;
}

.quick-task-modal__btn {
  padding: $spacing-sm $spacing-md;
  border-radius: $radius-md;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  border: none;

  &--ghost {
    background: $color-gray-100;
    color: $color-gray-700;

    &:hover:not(:disabled) {
      background: $color-gray-200;
    }
  }

  &--primary {
    background: $color-primary;
    color: $color-white;

    &:hover:not(:disabled) {
      background: $color-primary-dark;
    }
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}
</style>

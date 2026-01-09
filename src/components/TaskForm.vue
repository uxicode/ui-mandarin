<template>
  <div class="task-form">
    <h2 class="task-form__title">{{ isEditing ? '업무 수정' : '새 업무 추가' }}</h2>
    <form @submit.prevent="handleSubmit" class="task-form__form">
      <div class="task-form__field">
        <label class="task-form__label">제목 *</label>
        <input
          v-model="formData.title"
          type="text"
          class="task-form__input"
          placeholder="업무 제목을 입력하세요"
          required
        />
      </div>

      <div class="task-form__field">
        <label class="task-form__label">설명</label>
        <textarea
          v-model="formData.description"
          class="task-form__textarea"
          placeholder="업무 설명을 입력하세요 (선택사항)"
          rows="3"
        />
      </div>

      <div class="task-form__scores">
        <h3 class="task-form__scores-title">점수 입력</h3>
        <StarRating
          v-model:value="formData.scores.importance"
          label="중요도"
        />
        <StarRating
          v-model:value="formData.scores.urgency"
          label="시급성"
        />
      </div>

      <div class="task-form__actions">
        <button type="button" class="task-form__button task-form__button--cancel" @click="handleCancel">
          취소
        </button>
        <button type="submit" class="task-form__button task-form__button--submit">
          {{ isEditing ? '수정' : '추가' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import StarRating from './StarRating.vue'
import type { Task, TaskScores } from '@/types/task'

interface Props {
  task?: Task
}

interface Emits {
  (e: 'submit', task: Omit<Task, 'id'>): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isEditing = computed(() => !!props.task)

const formData = ref<{
  title: string
  description?: string
  scores: TaskScores
}>({
  title: '',
  description: '',
  scores: {
    importance: 3,
    urgency: 3,
  },
})

watch(
  () => props.task,
  (task) => {
    if (task) {
      formData.value = {
        title: task.title,
        description: task.description || '',
        scores: { ...task.scores },
      }
    } else {
      formData.value = {
        title: '',
        description: '',
        scores: {
          importance: 3,
          urgency: 3,
        },
      }
    }
  },
  { immediate: true }
)

function handleSubmit() {
  emit('submit', {
    title: formData.value.title,
    description: formData.value.description || undefined,
    scores: formData.value.scores,
  })
}

function handleCancel() {
  emit('cancel')
}
</script>


<style lang="scss" scoped>
.task-form {
  @include card;
  margin-bottom: $spacing-lg;
}

.task-form__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: $color-gray-900;
  margin-bottom: $spacing-lg;
}

.task-form__form {
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
}

.task-form__field {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
}

.task-form__label {
  font-size: 0.875rem;
  font-weight: 600;
  color: $color-gray-700;
}

.task-form__input,
.task-form__textarea {
  padding: $spacing-md;
  border: 1px solid $color-gray-300;
  border-radius: $radius-md;
  font-size: 1rem;
  color: $color-gray-900;
  background: $color-white;
  transition: border-color 0.2s;

  &:focus {
    border-color: $color-primary;
  }

  &::placeholder {
    color: $color-gray-400;
  }
}

.task-form__textarea {
  resize: vertical;
  min-height: 80px;
}

.task-form__scores {
  padding: $spacing-lg;
  background: $color-gray-50;
  border-radius: $radius-md;
}

.task-form__scores-title {
  font-size: 1rem;
  font-weight: 600;
  color: $color-gray-900;
  margin-bottom: $spacing-md;
}

.task-form__actions {
  display: flex;
  gap: $spacing-md;
  justify-content: flex-end;
}

.task-form__button {
  padding: $spacing-md $spacing-lg;
  border-radius: $radius-md;
  font-size: 0.875rem;
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
</style>


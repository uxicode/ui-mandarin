<template>
  <div class="task-list">
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
      @submit="handleAddSubmit"
      @cancel="handleAddCancel"
    />

    <div v-if="tasks.length === 0 && !showAddForm" class="task-list__empty">
      <p>업무가 없습니다. 새 업무를 추가해보세요.</p>
    </div>

    <div v-else class="task-list__items">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-item"
        :class="{ 
          'task-item--selected': selectedTaskId === task.id,
          'task-item--editing': editingTaskId === task.id
        }"
      >
        <!-- 일반 보기 모드 -->
        <div v-if="editingTaskId !== task.id" class="task-item__view" @click="handleTaskClick(task.id)">
          <div class="task-item__content">
            <h3 class="task-item__title">{{ task.title }}</h3>
            <p v-if="task.description" class="task-item__description">
              {{ task.description }}
            </p>
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
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import { calculateScores, getQuadrant as getQuadrantFromScores } from '@/utils/score-calculator'
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
const tasks = computed(() => taskStore.tasks)

// 새 업무 추가 폼 표시 여부
const showAddForm = ref(false)

// 편집 중인 업무 ID
const editingTaskId = ref<string | undefined>()

// 편집 폼 데이터
const editFormData = ref<{
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
function handleAddSubmit(task: Omit<Task, 'id'>) {
  taskStore.addTask(task)
  showAddForm.value = false
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
      scores: { ...task.scores },
    }
  }
}

// 업무 수정 제출
function handleEditSubmit(taskId: string) {
  taskStore.updateTask(taskId, {
    title: editFormData.value.title,
    description: editFormData.value.description || undefined,
    scores: editFormData.value.scores,
  })
  editingTaskId.value = undefined
}

// 업무 수정 취소
function handleEditCancel() {
  editingTaskId.value = undefined
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

.task-list__items {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  overflow-y: auto;
  flex: 1;
}

.task-item {
  @include card;
  border: 2px solid transparent;
  transition: all 0.3s ease;

  &--selected {
    border-color: $color-primary;
    background: $color-gray-50;
  }

  &--editing {
    border-color: $color-primary;
    box-shadow: $shadow-lg;
  }
}

.task-item__view {
  display: flex;
  justify-content: space-between;
  gap: $spacing-md;
  cursor: pointer;

  &:hover {
    .task-item__content {
      transform: translateX(2px);
    }
  }
}

.task-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
  transition: transform 0.2s;
}

.task-item__title {
  font-size: 1rem;
  font-weight: 600;
  color: $color-gray-900;
}

.task-item__description {
  font-size: 0.875rem;
  color: $color-gray-600;
  line-height: 1.5;
}

.task-item__scores {
  display: flex;
  gap: $spacing-md;
  flex-wrap: wrap;
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
</style>


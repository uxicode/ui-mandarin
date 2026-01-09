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

    <div v-if="tasks.length === 0" class="task-list__empty">
      <p>업무가 없습니다. 새 업무를 추가해보세요.</p>
    </div>

    <div v-else class="task-list__items">
      <div
        v-for="task in tasks"
        :key="task.id"
        class="task-item"
        :class="{ 'task-item--selected': selectedTaskId === task.id }"
        @click="handleTaskClick(task.id)"
      >
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import { calculateScores, getQuadrant as getQuadrantFromScores } from '@/utils/score-calculator'
import type { Task } from '@/types/task'

interface Props {
  selectedTaskId?: string
}

interface Emits {
  (e: 'add'): void
  (e: 'select', taskId: string): void
  (e: 'edit', taskId: string): void
  (e: 'delete', taskId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const taskStore = useTaskStore()
const tasks = computed(() => taskStore.tasks)

function computedScores(task: Task) {
  return calculateScores(task.scores)
}

function getQuadrant(task: Task) {
  const scores = computedScores(task)
  return getQuadrantFromScores(scores)
}

function handleAddClick() {
  emit('add')
}

function handleTaskClick(taskId: string) {
  emit('select', taskId)
}

function handleEditClick(taskId: string) {
  emit('edit', taskId)
}

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
  display: flex;
  justify-content: space-between;
  gap: $spacing-md;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;

  &:hover {
    box-shadow: $shadow-lg;
    transform: translateY(-2px);
  }

  &--selected {
    border-color: $color-primary;
    background: $color-gray-50;
  }
}

.task-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;
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
</style>


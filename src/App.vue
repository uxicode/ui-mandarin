<template>
  <div class="app">
    <header class="app__header">
      <h1 class="app__title">Mandarin Priority</h1>
      <p class="app__subtitle">감정이 아닌 수치로 업무 우선순위를 시각화</p>
    </header>

    <main class="app__main">
      <div class="app__sidebar">
        <TaskList
          :selected-task-id="selectedTaskId"
          @add="handleAdd"
          @select="handleSelect"
          @edit="handleEdit"
          @delete="handleDelete"
        />

        <TaskForm
          v-if="showForm"
          :task="editingTask"
          @submit="handleFormSubmit"
          @cancel="handleFormCancel"
        />
      </div>

      <div class="app__content">
        <PriorityMatrix :selected-task-id="selectedTaskId" @select="handleSelect" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTaskStore } from '@/stores/task-store'
import TaskList from '@/components/TaskList.vue'
import TaskForm from '@/components/TaskForm.vue'
import PriorityMatrix from '@/components/PriorityMatrix.vue'
import type { Task } from '@/types/task'

const taskStore = useTaskStore()

const selectedTaskId = ref<string | undefined>()
const showForm = ref(false)
const editingTaskId = ref<string | undefined>()

const editingTask = computed(() => {
  if (!editingTaskId.value) return undefined
  return taskStore.getTaskById(editingTaskId.value)
})

function handleAdd() {
  editingTaskId.value = undefined
  showForm.value = true
}

function handleSelect(taskId: string) {
  selectedTaskId.value = taskId
}

function handleEdit(taskId: string) {
  editingTaskId.value = taskId
  showForm.value = true
}

function handleDelete(taskId: string) {
  taskStore.deleteTask(taskId)
  if (selectedTaskId.value === taskId) {
    selectedTaskId.value = undefined
  }
}

function handleFormSubmit(task: Omit<Task, 'id'>) {
  if (editingTaskId.value) {
    taskStore.updateTask(editingTaskId.value, task)
  } else {
    taskStore.addTask(task)
  }
  showForm.value = false
  editingTaskId.value = undefined
}

function handleFormCancel() {
  showForm.value = false
  editingTaskId.value = undefined
}
</script>

<style lang="scss">
@use '@/styles/reset.scss';
@use '@/styles/index.scss' as *;

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app__header {
  padding: $spacing-lg $spacing-xl;
  background: $color-white;
  border-bottom: 1px solid $color-gray-200;
  box-shadow: $shadow-sm;
}

.app__title {
  font-size: 2rem;
  font-weight: 700;
  color: $color-gray-900;
  margin-bottom: $spacing-xs;
}

.app__subtitle {
  font-size: 0.875rem;
  color: $color-gray-600;
}

.app__main {
  flex: 1;
  display: flex;
  gap: $spacing-xl;
  padding: $spacing-xl;
  overflow: hidden;

  @include mobile {
    flex-direction: column;
    padding: $spacing-md;
    gap: $spacing-md;
  }
}

.app__sidebar {
  width: 400px;
  display: flex;
  flex-direction: column;
  gap: $spacing-lg;
  overflow-y: auto;

  @include mobile {
    width: 100%;
    max-height: 50vh;
  }
}

.app__content {
  flex: 1;
  min-height: 0;

  @include mobile {
    min-height: 50vh;
  }
}
</style>

